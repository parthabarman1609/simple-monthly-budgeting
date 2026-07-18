import logging
import os
from pathlib import Path
from typing import List
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, EmailStr
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from collections import defaultdict

# Import your actual Supabase client and Auth function
from common.supabase import supabase
from common.auth import get_current_user

# Logging setup ==========================
LOG_DIR = Path("/tmp/logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE_PATH = LOG_DIR / "groupService.log"

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

router = APIRouter()

# ==========================================
# 1. PYDANTIC MODELS
# ==========================================
class GroupCreateRequest(BaseModel):
    name: str
    invitees: List[EmailStr] = []

class InviteMembersRequest(BaseModel):
    invitees: List[EmailStr]

# ==========================================
# 2. EMAIL CONFIGURATION
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
# 3. BACKGROUND TASKS
# ==========================================
async def send_invitation_emails(invitations: list, group_name: str):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

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
            logger.error(error_msg)

# ==========================================
# 4. API ENDPOINTS
# ==========================================

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

@router.post("/api/v1/groups")
async def create_group(
    request: GroupCreateRequest, 
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
    ):
    user_id = user["sub"]
    
    try:
        group_res = supabase.table("groups").insert({
            "name": request.name,
            "created_by": user_id
        }).execute()
        
        if not group_res.data:
            raise HTTPException(status_code=400, detail="Failed to create group")
            
        new_group_id = group_res.data[0]['id']

        supabase.table("group_members").insert({
            "group_id": new_group_id,
            "user_id": user_id
        }).execute()

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

        if emails_to_dispatch:
            background_tasks.add_task(
                send_invitation_emails, 
                invitations=emails_to_dispatch, 
                group_name=request.name
            )

        return {
            "message": "Group created successfully",
            "group": group_res.data[0],
            "invitations_sent": len(emails_to_dispatch)
        }

    except Exception as e:
        logger.error(f"Error in create_group: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal server error occurred.")

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

# =========================================================
# REAL MCF BALANCES LOGIC FOR GROUP HOME
# =========================================================
@router.get("/api/v1/groups/summary")
def get_groups_summary(user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    
    # 1. Get groups the user belongs to
    groups_res = supabase.table("group_members").select("group_id, groups(id, name)").eq("user_id", user_id).execute()
    if not groups_res.data:
        return []

    group_ids = []
    result_map = {}
    
    for row in groups_res.data:
        if row.get("groups"):
            g_id = row["group_id"]
            group_ids.append(g_id)
            result_map[g_id] = {
                "id": g_id,
                "name": row["groups"]["name"],
                "members": [],
                "balances": []
            }
    
    if not group_ids:
        return []

    # 2. Get all members' names for these groups
    members_res = supabase.table("group_members").select("group_id, user_id, profiles(name)").in_("group_id", group_ids).execute()
    name_map = {}
    
    for m in members_res.data:
        g_id = m["group_id"]
        u_id = m["user_id"]
        name = m["profiles"]["name"] if m.get("profiles") else "Unknown"
        name_map[u_id] = name
        if g_id in result_map:
            result_map[g_id]["members"].append(name)

    # 3. Fetch expenses for these groups
    expenses_res = supabase.table("expenses").select("id, group_id, payer_id").in_("group_id", group_ids).execute()
    
    group_expenses = defaultdict(list)
    expense_payer_map = {}
    expense_ids = []
    
    for e in expenses_res.data:
        group_expenses[e["group_id"]].append(e)
        expense_payer_map[e["id"]] = e["payer_id"]
        expense_ids.append(e["id"])

    # 4. Fetch ONLY unsettled splits associated with these expenses
    splits_by_exp = defaultdict(list)
    if expense_ids:
        splits_res = supabase.table("expense_splits").select("*").in_("expense_id", expense_ids).neq("status", "settled").execute()
        for s in splits_res.data:
            splits_by_exp[s["expense_id"]].append(s)

    # 5. Run the Debt Calculator engine per group
    for g_id, g_data in result_map.items():
        balances = defaultdict(float)
        exps = group_expenses.get(g_id, [])
        
        for ex in exps:
            for sp in splits_by_exp.get(ex["id"], []):
                payer = expense_payer_map[ex["id"]]
                borrower = sp["user_id"]
                amt = float(sp.get("amount_owed", sp.get("amount", 0)))
                
                balances[payer] += amt
                balances[borrower] -= amt

        debtors, creditors = [], []
        for uid, bal in balances.items():
            r_bal = round(bal, 2)
            if r_bal < -0.01: 
                debtors.append([uid, abs(r_bal)])
            elif r_bal > 0.01: 
                creditors.append([uid, r_bal])

        # Sort descending to match largest debts first
        debtors.sort(key=lambda x: x[1], reverse=True)
        creditors.sort(key=lambda x: x[1], reverse=True)

        transactions = []
        i, j = 0, 0 

        while i < len(debtors) and j < len(creditors):
            d_id, d_amt = debtors[i]
            c_id, c_amt = creditors[j]
            settle_amount = min(d_amt, c_amt)
            
            if settle_amount > 0:
                payer_name = "You" if d_id == user_id else name_map.get(d_id, "Unknown")
                payee_name = "You" if c_id == user_id else name_map.get(c_id, "Unknown")
                transactions.append(f"{payer_name} owes {payee_name} £{settle_amount:.2f}")

            debtors[i][1] = round(d_amt - settle_amount, 2)
            creditors[j][1] = round(c_amt - settle_amount, 2)

            if debtors[i][1] <= 0:
                i += 1
            if creditors[j][1] <= 0:
                j += 1
                
        result_map[g_id]["balances"] = transactions
        
    return list(result_map.values())

@router.get("/api/v1/groups/{group_id}")
def get_group_detail(group_id: str, user: dict = Depends(get_current_user)):
    group_res = supabase.table("groups").select("name").eq("id", group_id).execute()
    if not group_res.data:
        raise HTTPException(status_code=404, detail="Group not found")
        
    members_res = supabase.table("group_members").select("profiles(name)").eq("group_id", group_id).execute()
    member_names = [m["profiles"]["name"] for m in members_res.data if m.get("profiles")]

    return {
        "id": group_id,
        "name": group_res.data[0]["name"],
        "members": member_names
    }

@router.get("/api/v1/groups/{group_id}/expenses")
def get_group_expenses(group_id: str, user: dict = Depends(get_current_user)):
    res = supabase.table("expenses")\
        .select("*, expense_splits(*, profiles(name))")\
        .eq("group_id", group_id)\
        .order("date", desc=True)\
        .execute()
    
    return res.data

@router.post("/api/v1/groups/{group_id}/invites")
async def invite_members_to_group(
    group_id: str,
    request: InviteMembersRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
    ):
    user_id = user["sub"]

    group_res = supabase.table("groups").select("name").eq("id", group_id).execute()
    if not group_res.data:
        raise HTTPException(status_code=404, detail="Group not found")
    group_name = group_res.data[0]["name"]

    member_res = supabase.table("group_members").select("*").eq("group_id", group_id).eq("user_id", user_id).execute()
    if not member_res.data:
        raise HTTPException(status_code=403, detail="You must be a member of this group to invite others.")

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
            raise HTTPException(status_code=400, detail="Failed to send invites. One or more users may already be invited.")

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

@router.get("/api/v1/groups/{group_id}/members")
def get_group_members_list(group_id: str, user: dict = Depends(get_current_user)):
    res = supabase.table("group_members").select("user_id, profiles(name)").eq("group_id", group_id).execute()
    return [{"user_id": m["user_id"], "name": m["profiles"]["name"] if m.get("profiles") else "Unknown"} for m in res.data]

# =========================================================
# BULLETPROOF MCF LOGIC FOR GROUP DETAIL
# =========================================================
@router.get("/api/v1/groups/{group_id}/balances")
def get_group_balances(group_id: str, user: dict = Depends(get_current_user)):
    # 1. Fetch expenses for the group
    exp_res = supabase.table("expenses").select("id, payer_id").eq("group_id", group_id).execute()
    expenses = exp_res.data
    
    if not expenses:
        return []

    expense_ids = [e["id"] for e in expenses]
    expense_payer_map = {e["id"]: e["payer_id"] for e in expenses}

    # 2. Fetch ONLY unsettled splits associated with these expenses
    splits_res = supabase.table("expense_splits").select("*").in_("expense_id", expense_ids).neq("status", "settled").execute()
    splits = splits_res.data

    # 3. Calculate Net Balances
    balances = defaultdict(float)
    
    for split in splits:
        payer_id = expense_payer_map[split["expense_id"]]
        borrower_id = split["user_id"]
        amount = float(split.get("amount_owed", split.get("amount", 0)))

        balances[payer_id] += amount
        balances[borrower_id] -= amount

    user_ids = list(balances.keys())
    profiles_res = supabase.table("profiles").select("id, name").in_("id", user_ids).execute()
    name_map = {p["id"]: p["name"] for p in profiles_res.data}

    # 4. Separate into Debtors and Creditors with strict rounding
    debtors = []   
    creditors = [] 

    for uid, balance in balances.items():
        r_bal = round(balance, 2)
        if r_bal < -0.01:
            debtors.append([uid, abs(r_bal)])
        elif r_bal > 0.01:
            creditors.append([uid, r_bal])

    # 5. The Greedy Matchmaker Engine (MUST BE SORTED DESCENDING)
    debtors.sort(key=lambda x: x[1], reverse=True)
    creditors.sort(key=lambda x: x[1], reverse=True)

    transactions = []
    i, j = 0, 0 

    while i < len(debtors) and j < len(creditors):
        debtor_id, debt_amount = debtors[i]
        creditor_id, credit_amount = creditors[j]

        settle_amount = min(debt_amount, credit_amount)
        
        if settle_amount > 0:
            transactions.append({
                "from": name_map.get(debtor_id, "Unknown"),
                "to": name_map.get(creditor_id, "Unknown"),
                "amount": round(settle_amount, 2)
            })

        debtors[i][1] = round(debt_amount - settle_amount, 2)
        creditors[j][1] = round(credit_amount - settle_amount, 2)

        if debtors[i][1] <= 0:
            i += 1
        if creditors[j][1] <= 0:
            j += 1

    return transactions