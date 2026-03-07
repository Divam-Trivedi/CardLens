from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.routing import APIRouter
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from auth import get_current_user
from storage import upload_pdf, delete_pdf
# from parser.amex_parser import parse_amex_statement
# from parser.bofa_parser import parse_bofa_statement
from parser.ai_parser import enrich_transactions, rule_based_categorize
from parser.universal_parser import parse_statement_universal
from services.rewards import calculate_rewards_for_statement
from dotenv import load_dotenv
import os, json, tempfile, logging
from typing import Optional

load_dotenv()
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
CONFIGS_PATH = os.path.join(os.path.dirname(__file__), "data", "card_configs.json")

app = FastAPI(title="CardLens API", root_path="")
router = APIRouter(prefix="/api")
# Increase upload size limit
from starlette.middleware.base import BaseHTTPMiddleware
app.add_middleware(BaseHTTPMiddleware, dispatch=lambda request, call_next: call_next(request))
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

@app.get("/api/cards")
def list_cards():
    db = get_db()
    return db.table("cards").select("*").execute().data

@app.get("/api/statements")
def list_statements(card_id: str = None, user_id: str = Depends(get_current_user)):
    db = get_db()
    q = db.table("statements").select("*, transactions(count)").eq("user_id", user_id)
    if card_id:
        q = q.eq("card_id", card_id)
    return q.order("year", desc=True).order("month", desc=True).execute().data
from fastapi.background import BackgroundTasks

@app.post("/api/upload")
async def upload_statement(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    card_id: str = Form(...),
    user_id: str = Depends(get_current_user)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files supported")

    db = get_db()
    card = db.table("cards").select("*").eq("id", card_id).single().execute().data
    if not card:
        raise HTTPException(404, f"Card {card_id} not found")

    # Read file immediately before timeout
    file_bytes = await file.read()
    filename = file.filename

    # Process in background
    background_tasks.add_task(process_statement, file_bytes, filename, card_id, card, user_id)

    return {"status": "processing", "message": "Statement uploaded, processing in background"}


async def process_statement(file_bytes, filename, card_id, card, user_id):
    import tempfile
    db = get_db()

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        parsed = parse_statement_universal(tmp_path, bank_hint=card.get("bank", "").lower())
    finally:
        os.unlink(tmp_path)

    with open(CONFIGS_PATH) as f:
        configs = json.load(f)
    merchant_map = configs.get("merchant_category_map", {})

    for txn in parsed["transactions"]:
        merchant, category = rule_based_categorize(txn["description"], merchant_map)
        txn["merchant"] = merchant
        txn["category"] = category

    try:
        parsed["transactions"] = await enrich_transactions(parsed["transactions"], card_id)
    except Exception as e:
        logger.warning(f"AI enrichment skipped: {e}")

    parsed["transactions"] = calculate_rewards_for_statement(parsed["transactions"], card_id)

    storage_path = upload_pdf(user_id, filename, file_bytes)

    # Safely extract year and month
    period_end = parsed.get("period_end")
    year = None
    month = None
    if period_end:
        if hasattr(period_end, 'year'):
            year = period_end.year
            month = period_end.month
        else:
            # It's already a string like "2025-04-11"
            from datetime import datetime
            dt = datetime.strptime(str(period_end), "%Y-%m-%d")
            year = dt.year
            month = dt.month
    elif parsed.get("year"):
        year = parsed.get("year")
        month = parsed.get("month")
    
    stmt = db.table("statements").insert({
        "user_id": user_id,
        "card_id": card_id,
        "filename": filename,
        "storage_path": storage_path,
        "period_start": str(parsed["period_start"]) if parsed.get("period_start") else None,
        "period_end": str(parsed["period_end"]) if parsed.get("period_end") else None,
        "year": year,
        "month": month,
        "total_spend": sum(t["amount"] for t in parsed["transactions"]),
        "total_rewards": sum(t.get("reward_earned", 0) for t in parsed["transactions"])
    }).execute().data[0]

    # Check for duplicate — same card, year, month
    if year and month:
        existing = db.table("statements")\
            .select("id")\
            .eq("user_id", user_id)\
            .eq("card_id", card_id)\
            .eq("year", year)\
            .eq("month", month)\
            .execute().data
        if existing:
            logger.warning(f"Duplicate statement detected for {card_id} {month}/{year} — skipping")
            return

    txn_rows = [{
        "user_id": user_id,
        "statement_id": stmt["id"],
        "card_id": card_id,
        "date": str(t["date"]),
        "description": t["description"],
        "merchant": t.get("merchant"),
        "category": t.get("category", "Other"),
        "amount": t["amount"],
        "reward_earned": t.get("reward_earned", 0.0),
        "reward_rate": t.get("reward_rate", 0.01),
        "year": t["date"].year,
        "month": t["date"].month,
        "raw_text": t.get("raw_text")
    } for t in parsed["transactions"]]

    if txn_rows:
        db.table("transactions").insert(txn_rows).execute()

    logger.info(f"Processed {len(parsed['transactions'])} transactions for {filename}")

@app.delete("/api/statements/{statement_id}")
def delete_statement(statement_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    stmt = db.table("statements").select("*").eq("id", statement_id).eq("user_id", user_id).single().execute().data
    if not stmt:
        raise HTTPException(404, "Not found")
    delete_pdf(stmt["storage_path"])
    db.table("statements").delete().eq("id", statement_id).execute()
    return {"status": "deleted"}

@app.delete("/api/cards/{card_id}")
def delete_card(card_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    stmts = db.table("statements").select("id").eq("user_id", user_id).eq("card_id", card_id).execute().data
    stmt_ids = [s["id"] for s in stmts]
    if stmt_ids:
        db.table("transactions").delete().in_("statement_id", stmt_ids).execute()
    db.table("statements").delete().eq("user_id", user_id).eq("card_id", card_id).execute()
    # Only delete the card row if no other user has statements for it
    other = db.table("statements").select("id").eq("card_id", card_id).execute().data
    if not other:
        db.table("cards").delete().eq("id", card_id).execute()
    return {"status": "deleted", "card_id": card_id}


@app.get("/api/transactions")
def get_transactions(
    card_id: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    category: Optional[str] = None,
    statement_id: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    db = get_db()
    query = db.table("transactions").select("*").eq("user_id", user_id)

    if card_id:      query = query.eq("card_id", card_id)
    if year:         query = query.eq("year", year)
    if month:        query = query.eq("month", month)
    if category:     query = query.eq("category", category)
    if statement_id: query = query.eq("statement_id", statement_id)

    result = query.order("date", desc=True).limit(1000).execute()
    return result.data


@app.get("/api/analytics")
def analytics(card_ids: str = None, year: int = None, month: int = None,
              statement_id: str = None, user_id: str = Depends(get_current_user)):
    db = get_db()
    q = db.table("transactions").select("*").eq("user_id", user_id)
    if card_ids:
        q = q.in_("card_id", card_ids.split(","))
    if year:
        q = q.eq("year", year)
    if month:
        q = q.eq("month", month)
    if statement_id:
        q = q.eq("statement_id", statement_id)
    transactions = q.execute().data
    if not transactions:
        return {"total_spend": 0, "total_reward": 0, "by_category": [], "by_merchant": [], "monthly": []}

    import calendar
    total_spend = sum(t["amount"] for t in transactions)
    total_reward = sum(t["reward_earned"] for t in transactions)

    cat_map = {}
    for t in transactions:
        cat = t["category"] or "Other"
        if cat not in cat_map: cat_map[cat] = {"amount": 0.0, "reward": 0.0}
        cat_map[cat]["amount"] += t["amount"]
        cat_map[cat]["reward"] += t["reward_earned"]

    by_category = sorted([{"category": c, "amount": round(d["amount"],2),
        "percentage": round(d["amount"]/total_spend*100,1) if total_spend else 0,
        "reward": round(d["reward"],2)} for c,d in cat_map.items()],
        key=lambda x: x["amount"], reverse=True)

    merch_map = {}
    for t in transactions:
        m = t["merchant"] or t["description"] or "Unknown"
        if m not in merch_map: merch_map[m] = {"amount": 0.0, "reward": 0.0}
        merch_map[m]["amount"] += t["amount"]
        merch_map[m]["reward"] += t["reward_earned"]

    by_merchant = sorted([{"merchant": m, "amount": round(d["amount"],2),
        "percentage": round(d["amount"]/total_spend*100,1) if total_spend else 0,
        "reward": round(d["reward"],2)} for m,d in merch_map.items()],
        key=lambda x: x["amount"], reverse=True)[:15]

    month_map = {}
    for t in transactions:
        key = (t["year"], t["month"])
        if key not in month_map: month_map[key] = {"spend": 0.0, "reward": 0.0}
        month_map[key]["spend"] += t["amount"]
        month_map[key]["reward"] += t["reward_earned"]

    monthly = [{"year": yr, "month": mo, "label": f"{calendar.month_abbr[mo]} {yr}",
        "total_spend": round(d["spend"],2), "total_reward": round(d["reward"],2), "by_category": []}
        for (yr,mo),d in sorted(month_map.items())]

    return {"total_spend": round(total_spend,2), "total_reward": round(total_reward,2),
            "by_category": by_category, "by_merchant": by_merchant, "monthly": monthly}

@app.post("/api/cards")
def add_card(card: dict, user_id: str = Depends(get_current_user)):
    db = get_db()
    existing = db.table("cards").select("id").eq("id", card["id"]).execute().data
    if existing:
        return {"status": "exists", "card_id": card["id"]}  # Already in DB, that's fine
    db.table("cards").insert({
        "id": card["id"],
        "name": card["name"],
        "bank": card["bank"],
        "reward_type": card.get("reward_type", "cashback"),
        "config": card.get("config", {})
    }).execute()
    return {"status": "created", "card_id": card["id"]}

@app.post("/api/reset")
def reset_all_data(user_id: str = Depends(get_current_user)):
    db = get_db()
    db.table("transactions").delete().eq("user_id", user_id).execute()
    db.table("statements").delete().eq("user_id", user_id).execute()
    # Clean up orphaned cards
    all_cards = db.table("cards").select("id").execute().data
    for card in all_cards:
        remaining = db.table("statements").select("id").eq("card_id", card["id"]).execute().data
        if not remaining:
            db.table("cards").delete().eq("id", card["id"]).execute()
    logger.info(f"Reset all data for user {user_id}")
    return {"status": "reset"}