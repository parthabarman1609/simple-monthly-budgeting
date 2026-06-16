from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

# Security scheme (this enables Swagger "Authorize" button)
security = HTTPBearer()

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization credentials"
        )

    token = credentials.credentials

    print(token)
    print(SUPABASE_JWT_SECRET)

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
            # audience="authenticated"  required for Supabase
        )

        print("DECODE SUCCESS:",payload)

        return payload  # contains user info (sub, email, etc.)

    except jwt.ExpiredSignatureError as e:
        print("JWT ERROR:",str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )

    except jwt.InvalidTokenError as e:
        print("JWT ERROR:",str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )