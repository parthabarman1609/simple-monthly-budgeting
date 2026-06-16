from fastapi import Request, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
import jwt
import os

security = HTTPBearer()

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing token")

    token = auth_header.split(" ")[1]

    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
        return payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")