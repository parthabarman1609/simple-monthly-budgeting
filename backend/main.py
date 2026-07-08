import os
from pathlib import Path
from dotenv import load_dotenv

# 1. LOAD THIS FIRST! Before importing any of your services
env_path = Path(__file__).resolve().parent / "services" / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import the routers from your microservices
from services.expenseService.main import router as expense_router
from services.groupService.main import router as group_router
from services.analyticsService.main import router as analytics_router
from services.profileService.main import router as profiles_router
from services.aiService.main import router as ai_router
from services.categoryService.main import router as category_router

app = FastAPI(title="SplitEasy API")

from mangum import Mangum
handler = Mangum(app)

origins = [
    "http://localhost:3000",
    "https://obscure-space-orbit-x5jg5w6g9gvp3p4rw-3000.app.github.dev",
    "https://main.d3o1gcik5ofq2v.amplifyapp.com"
]

# Global CORS setup (Applies to all services automatically)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://.*\.app\.github\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the microservices to the main app
app.include_router(expense_router)
app.include_router(group_router)
app.include_router(analytics_router)
app.include_router(profiles_router)
app.include_router(ai_router)
app.include_router(category_router)