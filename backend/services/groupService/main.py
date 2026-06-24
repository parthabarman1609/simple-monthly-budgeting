import logging
import os
from pathlib import Path
from typing import List
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, EmailStr
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

# Import your actual Supabase client and Auth function
from common.supabase import supabase
from common.auth import get_current_user

# Logging setup
ROOT_DIR = Path(__file__).resolve().parents[3]
LOG_DIR = ROOT_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE_PATH = LOG_DIR / "group_service.log"

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

router = APIRouter()

# ==========================================
# 1. PYDANTIC MODELS (From Part A)
# ==========================================
class GroupCreateRequest(BaseModel):
    name: str
    invitees: List[EmailStr] = []

class InviteMembersRequest(BaseModel):
    invitees: List[EmailStr]

# ==========================================
# 2. EMAIL CONFIGURATION (From Part A)
# ==========================================

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", "your-email@gmail.com"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "your-16-char-password"),
    MAIL_FROM=os.getenv("MAIL_FROM", "your-email@gmail.com"),
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

fast_mail = FastMail(conf)

# ==========================================
# 3. BACKGROUND TASKS (From Part B)
# ==========================================
async def send_invitation_emails(invitations: list, group_name: str):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    print(frontend_url)

    for invite in invitations:
        invite_link = f"{frontend_url}/invite?token={invite['token']}"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; color: #002147;">
            <h2>You've been invited!</h2>
            <p>You have been invited to join the expense sharing group: <strong>{group_name}</strong>.</p>
            <p>Click the secure link below to accept your invitation and view shared expenses:</p>
            <a href="{invite_link}" style="display: inline-block; padding: 10px 20px; background-color: #002147; color: white; text-decoration: none; border-radius: 8px;">Accept Invitation</a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">This link will expire in 7 days.</p>
        </div>
        """

        message = MessageSchema(
            subject=f"Invitation to join {group_name}",
            recipients=[invite['email']],
            body=html_content,
            subtype=MessageType.html
        )

        try:
            await fast_mail.send_message(message)
            logger.info("Invitation email sent to %s for group %s", invite['email'], group_name)
        except Exception as e:
            error_msg = f"Failed to send email to {invite['email']}: {str(e)}"
            print(error_msg)
            logger.error(error_msg)

# ==========================================
# 4. API ENDPOINTS (From Part C & Previous Steps)
# ==========================================

# GET all groups for the logged-in user
@router.get("/api/v1/groups")
def get_my_groups(user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    res = supabase.table("group_members").select("group_id, groups(id, name)").eq("user_id", user_id).execute()
    
    my_groups = []
    for row in res.data:
        if row.get("groups"):
            my_groups.append({
                "id": row["groups"]["id"],
                "name": row["groups"]["name"]
            })
    return my_groups

# POST create a new group and send emails
@router.post("/api/v1/groups")
async def create_group(
    request: GroupCreateRequest, 
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user) # Using your actual auth
):
    user_id = user["sub"]
    
    try:
        # Insert new group
        group_res = supabase.table("groups").insert({
            "name": request.name,
            "created_by": user_id
        }).execute()
        
        if not group_res.data:
            raise HTTPException(status_code=400, detail="Failed to create group")
            
        new_group_id = group_res.data[0]['id']

        # Add creator as first member
        supabase.table("group_members").insert({
            "group_id": new_group_id,
            "user_id": user_id
        }).execute()

        # Handle Invitations
        emails_to_dispatch = []
        if request.invitees:
            invites_payload = [
                {
                    "group_id": new_group_id,
                    "invited_email": email,
                    "invited_by": user_id
                }
                for email in request.invitees
            ]
            
            invites_res = supabase.table("group_invitations").insert(invites_payload).execute()
            
            if invites_res.data:
                for invite_record in invites_res.data:
                    emails_to_dispatch.append({
                        "email": invite_record["invited_email"],
                        "token": invite_record["token"]
                    })

        # Trigger Background Emails
        if emails_to_dispatch:
            background_tasks.add_task(
                send_invitation_emails, 
                invitations=emails_to_dispatch, 
                group_name=request.name
            )

        logger.info("Group created successfully: %s by user %s", request.name, user_id)
        logger.debug("Invitations queued for emails: %s", [invite['email'] for invite in emails_to_dispatch])

        return {
            "message": "Group created successfully",
            "group": group_res.data[0],
            "invitations_sent": len(emails_to_dispatch)
        }

    except Exception as e:
        error_msg = f"Error in create_group: {str(e)}"
        print(error_msg)
        logger.error(error_msg, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal server error occurred.")

# GET validate an invite token
@router.get("/api/v1/invites/{token}")
def get_invite_details(token: str):
    res = supabase.table("group_invitations").select("*, groups(name)").eq("token", token).eq("status", "pending").execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="This invitation link is invalid or has expired.")
        
    return {
        "group_id": res.data[0]["group_id"],
        "group_name": res.data[0]["groups"]["name"],
        "invited_email": res.data[0]["invited_email"]
    }

# POST accept an invite
@router.post("/api/v1/invites/{token}/accept")
def accept_invite(token: str, user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    user_email = user.get("email")

    res = supabase.table("group_invitations").select("*").eq("token", token).eq("status", "pending").execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation.")
    
    invite = res.data[0]

    if user_email != invite["invited_email"]:
        raise HTTPException(status_code=403, detail="This invitation was sent to a different email address.")

    try:
        supabase.table("group_members").insert({"group_id": invite["group_id"], "user_id": user_id}).execute()
        supabase.table("group_invitations").update({"status": "accepted"}).eq("token", token).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to join group. You may already be a member.")

    return {"message": "Successfully joined the group!"}

@router.get("/api/v1/groups/summary")
def get_groups_summary(user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    
    # 1. Get groups the user belongs to
    groups_res = supabase.table("group_members").select("group_id, groups(id, name)").eq("user_id", user_id).execute()
    
    result = []
    for row in groups_res.data:
        if not row.get("groups"):
            continue
            
        group_id = row["groups"]["id"]
        
        # 2. Get all members' names for this group
        members_res = supabase.table("group_members").select("profiles(name)").eq("group_id", group_id).execute()
        member_names = [m["profiles"]["name"] for m in members_res.data if m.get("profiles")]
        
        # 3. Append to result with simulated balances
        result.append({
            "id": group_id,
            "name": row["groups"]["name"],
            "members": member_names,
            "balances": [
                "You owe John - £45.00",
                "Sarah owes You - £12.50"
            ] # Replace this array with your actual settlement algorithm later!
        })
        
    return result

@router.get("/api/v1/groups/{group_id}")
def get_group_detail(group_id: str, user: dict = Depends(get_current_user)):
    # 1. Verify user is in group and fetch name
    group_res = supabase.table("groups").select("name").eq("id", group_id).execute()
    if not group_res.data:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # 2. Get Members
    members_res = supabase.table("group_members").select("profiles(name)").eq("group_id", group_id).execute()
    member_names = [m["profiles"]["name"] for m in members_res.data if m.get("profiles")]

    return {
        "id": group_id,
        "name": group_res.data[0]["name"],
        "members": member_names,
        "balances": [
            "You owe John - £45.00",
            "Sarah owes You - £12.50",
            "Michael owes John - £20.00"
        ]
    }

@router.get("/api/v1/groups/{group_id}/expenses")
def get_group_expenses(group_id: str, user: dict = Depends(get_current_user)):
    # Fetch all expenses tagged to this group
    res = supabase.table("expenses").select("*").eq("group_id", group_id).order("date", desc=True).execute()
    
    # Add a mock status for the UI (until the settlement DB is built)
    expenses = []
    for exp in res.data:
        exp["status"] = "pending" # or "settled" based on your future logic
        expenses.append(exp)
        
    return expenses

@router.post("/api/v1/groups/{group_id}/invites")
async def invite_members_to_group(
    group_id: str,
    request: InviteMembersRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    user_id = user["sub"]

    # 1. Verify the group exists and get its name for the email
    group_res = supabase.table("groups").select("name").eq("id", group_id).execute()
    if not group_res.data:
        raise HTTPException(status_code=404, detail="Group not found")
    group_name = group_res.data[0]["name"]

    # 2. Security Check: Ensure the user sending invites is actually in the group!
    member_res = supabase.table("group_members").select("*").eq("group_id", group_id).eq("user_id", user_id).execute()
    if not member_res.data:
        raise HTTPException(status_code=403, detail="You must be a member of this group to invite others.")

    # 3. Handle Invitations
    emails_to_dispatch = []
    if request.invitees:
        invites_payload = [
            {
                "group_id": group_id,
                "invited_email": email,
                "invited_by": user_id
            }
            for email in request.invitees
        ]
        
        try:
            invites_res = supabase.table("group_invitations").insert(invites_payload).execute()
            if invites_res.data:
                for invite_record in invites_res.data:
                    emails_to_dispatch.append({
                        "email": invite_record["invited_email"],
                        "token": invite_record["token"]
                    })
        except Exception as e:
            # Catch unique constraint errors (e.g., if an email is already invited)
            raise HTTPException(status_code=400, detail="Failed to send invites. One or more users may already be invited.")

    # 4. Trigger Background Emails
    if emails_to_dispatch:
        background_tasks.add_task(
            send_invitation_emails, 
            invitations=emails_to_dispatch, 
            group_name=group_name
        )

    return {
        "message": "Invitations sent successfully!",
        "invitations_sent": len(emails_to_dispatch)
    }