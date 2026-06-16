@app.get("/api/v1/reports/user")
def user_report(start_date: str, end_date: str, user_id: str = Depends(get_current_user)):

    expenses = supabase.rpc("user_expense_summary", {
        "uid": user_id,
        "start_date": start_date,
        "end_date": end_date
    }).execute()

    return expenses.data