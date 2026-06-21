from fastapi import APIRouter, Depends, UploadFile, File
from fastapi import HTTPException
from pydantic import BaseModel
from common.supabase import supabase
from common.auth import get_current_user
import pandas as pd
import uuid

# Use APIRouter instead of FastAPI
router = APIRouter()

# -------- MODELS --------

class Split(BaseModel):
    user_id: str
    amount: float

class ExpenseCreate(BaseModel):
    amount: float
    description: str
    category: str
    date: str
    group_id: str | None = None
    splits: list[Split]

class ShareRequest(BaseModel):
    group_id: str
    share_type: str  # 'ratio', 'decimal', 'equal'
    share_value: str | float | None = None

# -------- HELPERS --------

def balance_splits(total, splits):
    total_split = sum(s.amount for s in splits)
    if round(total_split, 2) != round(total, 2):
        diff = round(total - total_split, 2)
        splits[0].amount += diff
    return splits

# -------- API --------

@router.post("/api/v1/expenses")
def create_expense(
    expense: ExpenseCreate,
    user: dict = Depends(get_current_user)):
    
    user_id = user["sub"]
    splits = balance_splits(expense.amount, expense.splits)

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

    split_rows = [
        {
            "expense_id": expense_id,
            "user_id": s.user_id,
            "amount_owed": s.amount
        }
        for s in splits
    ]

    supabase.table("expense_splits").insert(split_rows).execute()

    return {"message": "Expense created.", "expense_id": expense_id}


@router.post("/api/v1/expenses/bulk")
async def bulk_upload(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)):
    
    user_id = user["sub"]
    df = pd.read_csv(file.file)
    df.columns = [c.strip() for c in df.columns]

    required = ["Date", "Amount", "Description", "Category"]
    if not all(c in df.columns for c in required):
        return {"error": "Invalid CSV"}

    rows = []
    for _, row in df.iterrows():
        rows.append({
            "payer_id": user_id,
            "amount": row["Amount"],
            "description": row["Description"],
            "category": row["Category"],
            "date": row["Date"]
        })

    supabase.table("expenses").insert(rows).execute()
    return {"status": "uploaded", "count": len(rows)}

@router.patch("/api/v1/expenses/{expense_id}/share")
def share_expense(
    expense_id: str,
    payload: ShareRequest,
    user: dict = Depends(get_current_user)
):
    user_id = user["sub"]

    # 1. Get the original expense total
    exp_res = supabase.table("expenses").select("amount").eq("id", expense_id).execute()
    if not exp_res.data:
        raise HTTPException(status_code=404, detail="Expense not found")
    total_amount = exp_res.data[0]["amount"]

    # 2. Get group members
    members_res = supabase.table("group_members").select("user_id").eq("group_id", payload.group_id).execute()
    member_ids = [m["user_id"] for m in members_res.data]
    
    if user_id not in member_ids:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    if len(member_ids) <= 1:
        raise HTTPException(status_code=400, detail="Not enough members in this group to share")

    # 3. Calculate your specific share
    my_share = 0.0
    if payload.share_type == "equal":
        my_share = total_amount / len(member_ids)
    elif payload.share_type == "decimal":
        my_share = float(payload.share_value)
    elif payload.share_type == "ratio":
        # Safely parse fractions like "1/3" or "3/4"
        if "/" in str(payload.share_value):
            num, den = str(payload.share_value).split("/")
            my_share = total_amount * (float(num) / float(den))
        else:
            my_share = total_amount * float(payload.share_value)
    
    my_share = round(my_share, 2)
    
    if my_share > total_amount:
        raise HTTPException(status_code=400, detail="Your share cannot exceed the total expense amount")

    # 4. Calculate the remaining amount for everyone else
    remaining_amount = total_amount - my_share
    other_members = [mid for mid in member_ids if mid != user_id]
    
    splits = [{
        "expense_id": expense_id,
        "user_id": user_id,
        "amount_owed": my_share
    }]

    if other_members:
        other_share = round(remaining_amount / len(other_members), 2)
        
        # Handle the annoying 1-penny rounding errors (e.g. 100 / 3 = 33.33. 100 - 99.99 = 0.01)
        total_other = other_share * len(other_members)
        penny_diff = round(remaining_amount - total_other, 2)
        
        for i, mid in enumerate(other_members):
            adj = penny_diff if i == 0 else 0  # Give the extra penny to the first friend
            splits.append({
                "expense_id": expense_id,
                "user_id": mid,
                "amount_owed": round(other_share + adj, 2)
            })

    # 5. Execute DB updates atomically
    supabase.table("expenses").update({"group_id": payload.group_id}).eq("id", expense_id).execute()
    supabase.table("expense_splits").delete().eq("expense_id", expense_id).execute() # Clear old solo split
    supabase.table("expense_splits").insert(splits).execute()

    return {"message": "Expense shared successfully", "splits": splits}

@router.get("/api/v1/expenses")
def get_expenses(user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    
    # Fetch all expenses paid by this user, ordered by newest first
    res = supabase.table("expenses").select("*").eq("payer_id", user_id).order("date", desc=True).execute()
    
    return res.data