from fastapi import APIRouter, Depends
from pydantic import BaseModel
from common.supabase import supabase
from common.auth import get_current_user
from pathlib import Path
import logging

# Use APIRouter instead of FastAPI
router = APIRouter()

# Logging setup ==========================
# if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
LOG_DIR = Path("/tmp/logs")
# else:
#     # Your original logic for local Codespace testing
#     ROOT_DIR = Path(__file__).resolve().parents[3]
#     LOG_DIR = ROOT_DIR / "logs"
#
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE_PATH = LOG_DIR / "categoryService.log"

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

# ==========================================
# 0. Models
# ==========================================
# 1. Define the new Pydantic Model
class CategoryResponse(BaseModel):
    id: int
    name: str

# ==========================================
# 1. APIs
# ==========================================

@router.get("/api/v1/categories", response_model=list[CategoryResponse])
def get_categories(user: dict = Depends(get_current_user)):
    # Fetch categories ordered by priority
    res = supabase.table("expense_categories").select("id, name").order("priority_order").execute()
    return res.data