from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient
import os
from dotenv import load_dotenv
import logging
from pathlib import Path

load_dotenv()

# Logging setup ==========================
ROOT_DIR = Path(__file__).resolve().parents[3]
LOG_DIR = ROOT_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE_PATH = LOG_DIR / "auth.log"

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
    logger.info(f"Received token: {token}")  # Debugging line to print the token

    try:
        # 1. Dynamically fetch the public key matching this specific token
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        logger.info(f"Fetched signing key: {signing_key.key}")  # Debugging line to print the signing key
        
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