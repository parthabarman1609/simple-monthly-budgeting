import os
import json
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List
import anthropic

router = APIRouter()

# Setup Anthropic Client
# This will automatically look for ANTHROPIC_API_KEY in your environment
client = anthropic.Anthropic()

# -----------------------------------------
# Pydantic Models for the Frontend Response
# -----------------------------------------
class ExtractedExpense(BaseModel):
    date: str
    amount: float
    description: str
    category: str

class AIResponse(BaseModel):
    expenses: List[ExtractedExpense]

# -----------------------------------------
# The AI Route
# -----------------------------------------
@router.post("/parse-csv", response_model=AIResponse)
async def parse_bank_statement(file: UploadFile = File(...)):
    # 1. Read the uploaded file
    try:
        contents = await file.read()
        raw_text = contents.decode("utf-8")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Could not read the uploaded CSV file.")
        
    # 2. The System Prompt (The Magic Sauce)
    system_prompt = """
    You are an expert financial data extraction AI. 
    The user will provide raw text from a bank or credit card CSV statement.
    Your job is to extract ONLY the valid expenses and return them in a strict JSON array.
    
    Rules:
    1. Extract the Date, Amount, Description/Memo, and Category.
    2. Convert all dates to standard 'YYYY-MM-DD' format.
    3. Ignore ALL income, salary, counter credits, or payments made to a credit card. Only extract actual spending/expenses.
    4. Make sure all extracted amounts are absolute POSITIVE numbers (e.g., if the CSV says -20.00, return 20.00. If the CSV says 3.00, return 3.00).
    5. Clean up the descriptions (remove extra spaces, bank jargon, or weird characters).
    6. Return ONLY a raw JSON array of objects. Do NOT wrap it in markdown block quotes (like ```json), do not add any conversational text.
    
    Expected Output Format:
    [
      {
        "date": "2026-05-29",
        "amount": 20.00,
        "description": "Lebara Mobile Limited",
        "category": "Card Purchase"
      }
    ]
    """

    # 3. Call Claude 3 Haiku
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001", # <-- Updated to the live model!
            max_tokens=2000,
            system=system_prompt,
            messages=[
                {"role": "user", "content": f"Here is the raw CSV text:\n\n{raw_text}"}
            ]
        )
        
        # 4. Parse the AI's response back into JSON
        ai_text = response.content[0].text.strip()
        
        # Claude might sometimes still add markdown despite instructions, so we clean it just in case
        if ai_text.startswith("```json"):
            ai_text = ai_text.replace("```json", "").replace("```", "").strip()
            
        parsed_expenses = json.loads(ai_text)
        
        return {"expenses": parsed_expenses}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Processing failed: {str(e)}")