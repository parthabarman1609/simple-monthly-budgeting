@app.post("/api/v1/groups")
def create_group(name: str, user_id: str = Depends(get_current_user)):
    res = supabase.table("groups").insert({
        "name": name,
        "created_by": user_id
    }).execute()

    group_id = res.data[0]["id"]

    # auto add creator
    supabase.table("group_members").insert({
        "group_id": group_id,
        "user_id": user_id
    }).execute()

    return {"group_id": group_id}


@app.post("/api/v1/groups/{group_id}/members")
def add_member(group_id: str, user_id: str):
    return supabase.table("group_members").insert({
        "group_id": group_id,
        "user_id": user_id
    }).execute()