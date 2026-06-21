from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from common.supabase import supabase
from common.auth import get_current_user

router = APIRouter()

# Expanded to match all the new frontend fields
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    goals: Optional[List[str]] = None
    profile_pic: Optional[str] = None

@router.post("/api/v1/profiles")
def upsert_profile(profile: ProfileUpdate, user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    email = user.get("email")

    update_data = {
        "id": user_id,
        "email": email,
        "name": profile.name,
        "dob": profile.dob,
        "gender": profile.gender,
        "country": profile.country,
        "city": profile.city,
        "goals": profile.goals,
        "profile_pic": profile.profile_pic
    }

    # Upsert merges the new data with the existing row
    res = supabase.table("profiles").upsert(update_data).execute()
    return {"message": "Profile synced", "profile": res.data[0]}

@router.get("/api/v1/profiles/me")
def get_my_profile(user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    res = supabase.table("profiles").select("*").eq("id", user_id).execute()
    return res.data[0] if res.data else {"error": "Profile not found"}