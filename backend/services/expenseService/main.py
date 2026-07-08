from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks
from fastapi import HTTPException
from pydantic import BaseModel
from common.supabase import supabase
from common.auth import get_current_user
from pathlib import Path
import pandas as pd
import pandas as pd
import numpy as np
import re
import io
import logging
import uuid

# Use APIRouter instead of FastAPI
router = APIRouter()

# Logging setup ==========================
# if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
LOG_DIR = Path("/tmp/logs")
# else:
#     # Your original logic for local Codespace testing
#     ROOT_DIR = Path(__file__).resolve().parents[3]
#     LOG_DIR = ROOT_DIR / "logs"
#
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE_PATH = LOG_DIR / "expenseService.log"

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
logger.propagate = False

if logger.hasHandlers():
    logger.handlers.clear()

file_handler = logging.FileHandler(LOG_FILE_PATH, encoding="utf-8")
file_handler.setLevel(logging.DEBUG)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.ERROR)

formatter = logging.Formatter(
    "%(asctime)s %(levelname)s %(name)s %(message)s"
    )
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

logger.addHandler(file_handler)
logger.addHandler(console_handler)
#================================

# ==========================================
# 0. Models
# ==========================================
class SplitInstruction(BaseModel):
    user_id: str
    share_type: str  # 'equal', 'fraction', 'amount'
    share_value: str | float | None = None

class ExpenseCreate(BaseModel):
    amount: float
    description: str
    category: str
    date: str
    group_id: str | None = None
    splits: list[SplitInstruction] = [] # Unified split payload

class ShareRequest(BaseModel):
    group_id: str
    splits: list[SplitInstruction] = [] # Unified split payload

class ClaimRequest(BaseModel):
    amount: float

# ==========================================
# 1. CATEGORIZATION DICTIONARY (Order matters!)
# ==========================================
CATEGORY_KEYWORDS = {
    "Vacation": ['ryanair', 'jet2', 'british airways', 'hotel', 'airbnb', 'booking', 'easyjet', 'stansted', 'heathrow'],
    "Restaurants": ['mcdonalds', 'tortilla', 'lokal', 'eats', 'deliveroo', 'pub', 'kfc', 'gelato', 'bakery', 'karapincha', 'chicken', 'los capolitos'],
    "Commute": ['tfl', 'uber trip', 'train', 'bus', 'first west of england', 'express', 'dpp', 'transport'],
    "Groceries": ['tesco', 'waitrose', 'sainsbury', 'billa', 'aldi', 'lidl', 'asda', 'morrisons', 'co-op', 'centra', 'brogyllen', 'loomisp'],
    "Online Shopping": ['amazon', 'amzn'],
    "Utilities": ['ee limited', 'water', 'energy', 'gas'],
    "Peer-Transfer": ['payment from', 'transfer', 'sent to'],
    "Business & Fees": ['amazon prime', 'card fee']
}

# ==========================================
# 2. HEURISTIC PROCESSING FUNCTIONS
# ==========================================
def clean_description(desc: str) -> str:
    """Removes URLs, long transaction IDs, special chars, and limits to 10 words."""
    if pd.isna(desc): return "Unknown Merchant"
    desc = str(desc)
    
    # 1. Strip URLs (e.g., https://help.uber.com)
    desc = re.sub(r'https?://\S+', '', desc, flags=re.IGNORECASE)
    # 2. Strip long bank/transaction IDs (10+ alphanumeric characters)
    desc = re.sub(r'[A-Za-z0-9]{10,}', '', desc)
    # 3. Strip special characters except spaces and dots
    desc = re.sub(r'[^A-Za-z0-9\s.,]', ' ', desc)
    # 4. Remove extra whitespaces
    desc = re.sub(r'\s+', ' ', desc).strip()
    
    # 5. Truncate to first 10 words
    words = desc.split()[:10]
    return " ".join(words)

def assign_category(clean_desc: str, dynamic_categories: list) -> str:
    desc_lower = clean_desc.lower()
    for cat in dynamic_categories:
        if any(kw in desc_lower for kw in cat["keywords"]):
            return cat["name"]
    return "None"

def sniff_columns(df: pd.DataFrame):
    """Dynamically finds Date, Amount, and Description columns using Headers or Heuristics."""
    date_col, amt_col, desc_col = None, None, None
    
    # PHASE 1: Header Sniffing
    for col in df.columns:
        c_lower = str(col).lower()
        if any(x in c_lower for x in ['date', 'time']): date_col = col
        elif any(x in c_lower for x in ['amount', 'value', 'debit', 'credit']): amt_col = col
        elif any(x in c_lower for x in ['description', 'memo', 'appears', 'details']): desc_col = col

    # PHASE 2: Heuristic Data Sniffing (Fallback for missing/weird headers)
    sample = df.head(10).astype(str)
    
    if not date_col:
        for col in df.columns:
            # Looks for DD/MM/YYYY, YYYY-MM-DD, or DD MMM YY
            if sample[col].str.contains(r'\d{1,4}[/-]\d{1,2}[/-]\d{1,4}|\d{1,2}\s[a-zA-Z]{3}').mean() > 0.5:
                date_col = col; break
                
    if not amt_col:
        numeric_candidates = {}
        
        # 1. Evaluate every column and save the ones that contain numbers
        for col in df.columns:
            try:
                numeric_series = pd.to_numeric(df[col], errors='coerce')
                fill_rate = numeric_series.notna().mean()
                
                # If it's more than 80% full, we found a standard single-column amount!
                if fill_rate > 0.8:
                    amt_col = col
                    break
                # Otherwise, if it has SOME numbers, save it for a potential merge later
                elif fill_rate > 0.05: 
                    numeric_candidates[col] = numeric_series
            except: 
                pass
            
        # 2. If no single column won, try merging the sparse accounting columns (Like Barclays!)
        if not amt_col and len(numeric_candidates) >= 2:
            # Create a completely blank column
            merged_series = pd.Series(np.nan, index=df.index)
            
            # Layer the sparse columns on top of each other to fill in the blanks
            for col_name, series in numeric_candidates.items():
                merged_series = merged_series.fillna(series)
            
            # Check if our new Frankenstein column passes the 80% test
            if merged_series.notna().mean() > 0.8:
                amt_col = "Merged_Amount"
                df[amt_col] = merged_series # Inject the merged column into the DataFrame
            
    if not desc_col:
        max_len = 0
        for col in df.columns:
            if col not in [date_col, amt_col]:
                # The text column with the longest average length is usually the description
                avg_len = sample[col].str.len().mean()
                if avg_len > max_len:
                    max_len = avg_len
                    desc_col = col

    return date_col, amt_col, desc_col

# ==========================================
# 3. ASYNC BACKGROUND WORKER
# ==========================================
async def process_csv_background(file_content: bytes, user_id: str):
    """Runs asynchronously to parse, clean, and upload data to Supabase."""
    try:
        # 1. Read the CSV WITHOUT assuming the first row is a header
        df = pd.read_csv(io.BytesIO(file_content), header=None)
        
        # 2. Smart Header Detection (Data-Driven)
        # We check if the first row contains actual transactional data (dates or numbers)
        first_row = df.iloc[0]
        first_row_str = first_row.astype(str)
        
        # Check if any cell matches our standard date regex
        has_date = first_row_str.str.contains(r'\d{1,4}[/-]\d{1,2}[/-]\d{1,4}|\d{1,2}\s[a-zA-Z]{3}').any()
        
        # Check if any cell is a pure, valid number (ignoring text/blanks)
        has_number = pd.to_numeric(first_row, errors='coerce').notna().any()
        
        # If the row has a date OR a number, it's data, NOT a header
        is_header = not (has_date or has_number)
        
        if is_header:
            # It's a header! Promote the first row to be column names
            df.columns = df.iloc[0]
            df = df[1:].reset_index(drop=True)
        else:
            # It's not a header (e.g. Barclays Credit Card). Keep it as data!
            df.columns = df.columns.astype(str)

        # 3. Sniff the dynamic columns
        date_col, amt_col, desc_col = sniff_columns(df)
        
        if not all([date_col, amt_col, desc_col]):
            logger.error("Heuristics failed to identify Date, Amount, or Description columns.")
            return

        # 4. Clean numeric amounts
        # Remove currency symbols/commas and convert to floats
        df[amt_col] = df[amt_col].astype(str).str.replace(r'[£$,]', '', regex=True)
        df[amt_col] = pd.to_numeric(df[amt_col], errors='coerce')
        df = df.dropna(subset=[amt_col]) # Drop rows that don't have an amount
        
        # 5. Directional Inference (Find if expenses are stored as positive or negative)
        positive_count = (df[amt_col] > 0).sum()
        negative_count = (df[amt_col] < 0).sum()
        
        # If there are more negatives, negatives are expenses (e.g. Barclays Account)
        if negative_count > positive_count:
            # Keep only negatives, and make them absolute positive numbers
            df = df[df[amt_col] < 0]
            df[amt_col] = df[amt_col].abs()
        else:
            # Positives are expenses (e.g. Amex Credit Card)
            # Exclude negative top-ups/payments
            df = df[df[amt_col] > 0]

        # 6. Process Rows for Database Insertion
        # Smart Date Parsing: Check if the dates start with a 4-digit Year (e.g. Revolut: 2026-05-23)
        sample_date = str(df[date_col].dropna().iloc[0]).strip()
        
        if re.match(r'^\d{4}', sample_date):
            # ISO Format (YYYY-MM-DD). Do NOT use dayfirst.
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        else:
            # UK Format (DD/MM/YYYY). Enforce dayfirst.
            df[date_col] = pd.to_datetime(df[date_col], dayfirst=True, errors='coerce')
            
        # Drop rows where dates failed to parse (i.e. invalid rows/garbage text)
        df = df.dropna(subset=[date_col])

        # Fetch dynamic categories and keywords ONCE per CSV upload
        cat_res = supabase.table("expense_categories").select("*").order("priority_order").execute()
        dynamic_categories = cat_res.data
        
        rows_to_insert = []
        for _, row in df.iterrows():
            clean_text = clean_description(row[desc_col])
            
            rows_to_insert.append({
                "payer_id": user_id,
                "amount": float(row[amt_col]),
                "description": clean_text,
                "category": assign_category(clean_text, dynamic_categories),
                "date": row[date_col].strftime('%Y-%m-%d')
            })

        # Insert into Supabase in chunks to avoid payload limits
        chunk_size = 100
        for i in range(0, len(rows_to_insert), chunk_size):
            chunk = rows_to_insert[i:i + chunk_size]
            logger.info(f"Inserting chunk of {chunk} expenses for user {user_id}")
            #supabase.table("expenses").insert(chunk).execute()

        logger.info(f"Successfully processed and inserted {len(rows_to_insert)} expenses for user {user_id}")

    except Exception as e:
        logger.error(f"Background CSV processing failed: {str(e)}")

# ==========================================
# 4. Helper functions
# ==========================================
def apply_unified_splits(expense_id: str, group_id: str, total_amount: float, splits: list[SplitInstruction]):
    calculated_splits = []
    fixed_total = 0.0
    equal_users = []

    # PASS 1: Calculate exact amounts (Fractions & Fixed Amounts)
    for s in splits:
        if s.share_type == "amount":
            val = float(s.share_value or 0)
            fixed_total += val
            calculated_splits.append({"user_id": s.user_id, "amount_owed": round(val, 2)})
            
        elif s.share_type == "fraction":
            if s.share_value and "/" in str(s.share_value):
                num, den = str(s.share_value).split("/")
                val = total_amount * (float(num) / float(den))
            else:
                val = total_amount * float(s.share_value or 0)
            fixed_total += val
            calculated_splits.append({"user_id": s.user_id, "amount_owed": round(val, 2)})
            
        elif s.share_type == "equal":
            equal_users.append(s.user_id)

    # PASS 2: Distribute the remaining pool to the 'equal' users
    remaining = total_amount - fixed_total
    
    if remaining < -0.01:
        raise HTTPException(status_code=400, detail="The explicit amounts assigned exceed the total expense!")

    if equal_users:
        remaining = max(0, remaining) # Prevent negative distribution
        base_share = round(remaining / len(equal_users), 2)
        
        # Handle the 1-penny rounding anomaly (e.g., £10.00 / 3 = £3.33 each, leaving £0.01)
        total_equal = base_share * len(equal_users)
        penny_diff = round(remaining - total_equal, 2)

        for i, uid in enumerate(equal_users):
            adj = penny_diff if i == 0 else 0 # Give the extra penny to the first user in the array
            calculated_splits.append({
                "user_id": uid, 
                "amount_owed": round(base_share + adj, 2)
            })

    # Validate the final math
    final_total = sum(s["amount_owed"] for s in calculated_splits)
    if final_total > total_amount + 0.01:
         raise HTTPException(status_code=400, detail="Server Error: Calculated splits exceed total.")

    # Execute DB Updates atomically
    supabase.table("expenses").update({"group_id": group_id}).eq("id", expense_id).execute()
    supabase.table("expense_splits").delete().eq("expense_id", expense_id).execute()
    
    if calculated_splits:
        rows = [
            {"expense_id": expense_id, "user_id": s["user_id"], "amount_owed": s["amount_owed"], "status": "pending"}
            for s in calculated_splits
        ]
        supabase.table("expense_splits").insert(rows).execute()

# ==========================================
# 5. APIs
# ==========================================
@router.post("/api/v1/expenses")
def create_expense(expense: ExpenseCreate, user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    
    expense_data = {
        "payer_id": user_id,
        "amount": expense.amount,
        "description": expense.description,
        "category": expense.category,
        "date": expense.date,
        "group_id": expense.group_id
    }
    res = supabase.table("expenses").insert(expense_data).execute()
    expense_id = res.data[0]["id"]

    if expense.group_id and expense.splits:
        apply_unified_splits(expense_id, expense.group_id, expense.amount, expense.splits)

    return {"message": "Expense created.", "expense_id": expense_id}

@router.post("/api/v1/expenses/bulk")
async def bulk_upload(
    background_tasks: BackgroundTasks, # Injects the background worker
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)):

    user_id = user["sub"]
    
    # Read file content fully into memory so the background task has access to it 
    # even after the HTTP request is instantly closed.
    file_content = await file.read()
    
    # Hand the heavy lifting off to the background thread
    background_tasks.add_task(process_csv_background, file_content, user_id)
    
    # Return instantly to unblock the UI
    return {
        "status": "processing", 
        "message": "Your file is being intelligently processed. Expenses will appear in your dashboard shortly."
    }

@router.patch("/api/v1/expenses/{expense_id}/share")
def share_expense(expense_id: str, payload: ShareRequest, user: dict = Depends(get_current_user)):
    user_id = user["sub"]

    exp_res = supabase.table("expenses").select("amount, payer_id").eq("id", expense_id).execute()
    if not exp_res.data:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    if exp_res.data[0]["payer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the expense owner can assign shares.")

    total_amount = exp_res.data[0]["amount"]
    apply_unified_splits(expense_id, payload.group_id, total_amount, payload.splits)
    
    return {"message": "Expense splits successfully updated!"}

@router.get("/api/v1/expenses")
def get_expenses(user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    
    # Fetch all expenses paid by this user, ordered by newest first
    res = supabase.table("expenses").select("*").eq("payer_id", user_id).order("date", desc=True).execute()
    
    return res.data

@router.patch("/api/v1/expenses/{expense_id}/claim")
def claim_expense(
    expense_id: str,
    payload: ClaimRequest,
    user: dict = Depends(get_current_user)
):
    user_id = user["sub"]

    # 1. Get the original expense total
    exp_res = supabase.table("expenses").select("amount").eq("id", expense_id).execute()
    if not exp_res.data:
        raise HTTPException(status_code=404, detail="Expense not found")
    total_amount = exp_res.data[0]["amount"]

    # 2. Fetch existing splits to validate we don't exceed the pool
    splits_res = supabase.table("expense_splits").select("*").eq("expense_id", expense_id).execute()
    
    # Calculate total claimed by EVERYONE ELSE (excluding current user if they are editing their claim)
    other_claims = sum(float(s["amount_owed"]) for s in splits_res.data if s["user_id"] != user_id)

    if other_claims + payload.amount > total_amount + 0.01:
        raise HTTPException(status_code=400, detail="Claim exceeds remaining pool")

    # 3. Upsert the split (Delete existing split for this user if it exists, then Insert)
    supabase.table("expense_splits").delete().eq("expense_id", expense_id).eq("user_id", user_id).execute()
    
    new_split = {
        "expense_id": expense_id,
        "user_id": user_id,
        "amount_owed": payload.amount,
        "status": "pending"
    }
    supabase.table("expense_splits").insert(new_split).execute()

    return {"message": "Claim saved successfully"}

@router.put("/api/v1/expenses/{expense_id}")
def update_expense(expense_id: str, expense: ExpenseCreate, user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    
    # 1. Verify Ownership
    exp_res = supabase.table("expenses").select("payer_id").eq("id", expense_id).execute()
    if not exp_res.data:
        raise HTTPException(status_code=404, detail="Expense not found")
    if exp_res.data[0]["payer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can edit this expense.")

    # 2. Update Expense Record
    expense_data = {
        "amount": expense.amount,
        "description": expense.description,
        "category": expense.category,
        "date": expense.date,
        "group_id": expense.group_id
    }
    supabase.table("expenses").update(expense_data).eq("id", expense_id).execute()

    # 3. Handle Splits
    if expense.group_id and expense.splits:
        apply_unified_splits(expense_id, expense.group_id, expense.amount, expense.splits)
    else:
        # If they removed the group, wipe the splits so it becomes a personal expense again
        supabase.table("expense_splits").delete().eq("expense_id", expense_id).execute()

    return {"message": "Expense updated successfully."}

@router.get("/api/v1/expenses/{expense_id}/splits")
def get_expense_splits(expense_id: str, user: dict = Depends(get_current_user)):
    # Clean API endpoint to fetch splits if the frontend needs a fresh copy
    res = supabase.table("expense_splits").select("*").eq("expense_id", expense_id).execute()
    return res.data

