from fastapi import FastAPI, Depends, UploadFile, File
from pydantic import BaseModel
from common.supabase import supabase
from common.auth import get_current_user
import pandas as pd
import uuid

app = FastAPI()

# -------- MODELS --------

class Split(BaseModel):
    user_id: str
    amount: float

# Expense Class where 'splits' is mandatory. 
# If the expense is born by 1 person, then the 'split amount' should match main 'amount'.
class ExpenseCreate(BaseModel):
    amount: float
    description: str
    category: str
    date: str
    group_id: str | None = None
    splits: list[Split]


# -------- HELPERS --------

def balance_splits(total, splits):
    total_split = sum(s.amount for s in splits)

    print(total_split)

    if round(total_split, 2) != round(total, 2):
        diff = round(total - total_split, 2)
        print(diff)
        splits[0].amount += diff

    return splits

# -------- API --------

@app.post("/api/v1/expenses")
def create_expense(
    expense: ExpenseCreate,
    user_id: str = "04a26012-7d92-4daa-823f-198b2390192d"
    # user_id: str = Depends(get_current_user)
):
    print(expense.amount)
    print(expense.splits)
    
    splits = balance_splits(expense.amount, expense.splits)
    print(splits)

    # Insert expense
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

    # Insert splits
    split_rows = [
        {
            "expense_id": expense_id,
            "user_id": s.user_id,
            "amount_owed": s.amount
        }
        for s in splits
    ]

    supabase.table("expense_splits").insert(split_rows).execute()

    return {
        "message":"Expense created.",
        "expense_id": expense_id}

@app.post("/api/v1/expenses/bulk")
async def bulk_upload(
    file: UploadFile = File(...),
    user_id: str = "04a26012-7d92-4daa-823f-198b2390192d"
    # user_id: str = Depends(get_current_user)
):
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