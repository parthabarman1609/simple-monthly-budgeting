from fastapi import APIRouter, Depends
from common.supabase import supabase
from common.auth import get_current_user

router = APIRouter()

@router.post("/api/v1/groups")
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

@router.post("/api/v1/groups/{group_id}/members")
def add_member(group_id: str, user_id: str):
    return supabase.table("group_members").insert({
        "group_id": group_id,
        "user_id": user_id
    }).execute()

@router.get("/api/v1/groups")
def get_my_groups(user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    
    # Query the junction table (group_members) and use Supabase's foreign key 
    # auto-join feature to grab the actual group details in the same query.
    res = supabase.table("group_members").select("group_id, groups(id, name)").eq("user_id", user_id).execute()
    
    # Format the data cleanly for the frontend
    my_groups = []
    for row in res.data:
        if row.get("groups"):
            my_groups.append({
                "id": row["groups"]["id"],
                "name": row["groups"]["name"]
            })
            
    return my_groups