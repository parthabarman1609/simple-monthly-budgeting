from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient
import os
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer()

# We only need the URL now, no secret required!
SUPABASE_URL = os.getenv("SUPABASE_URL")
if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is missing in your .env file")

# This is the public endpoint where Supabase publishes keys to verify ES256 tokens
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# PyJWKClient automatically fetches and caches the public keys
jwks_client = PyJWKClient(JWKS_URL)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization credentials"
        )

    token = credentials.credentials
    print(f"Received token: {token}")  # Debugging line to print the token

    try:
        # 1. Dynamically fetch the public key matching this specific token
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        print(f"Fetched signing key: {signing_key.key}")  # Debugging line to print the signing key
        
        # 2. Verify the ES256 token using the public key
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            options={"verify_aud": False}
        )
        return payload

    except jwt.PyJWKClientError as e:
        raise HTTPException(status_code=401, detail=f"JWKS Error: {str(e)}")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"JWT ERROR (Invalid Token): {str(e)}")