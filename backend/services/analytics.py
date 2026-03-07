from sqlalchemy.orm import Session
from typing import Optional, List
from models.database import Transaction, Statement
import calendar

def get_analytics(db, card_ids=None, year=None, month=None, statement_id=None, top_n_merchants=15):
    query = db.query(Transaction)
    if card_ids:
        query = query.filter(Transaction.card_id.in_(card_ids))
    if year:
        query = query.filter(Transaction.year == year)
    if month:
        query = query.filter(Transaction.month == month)
    if statement_id:
        query = query.filter(Transaction.statement_id == statement_id)
    transactions = query.all()
    if not transactions:
        return {"total_spend": 0, "total_reward": 0, "by_category": [], "by_merchant": [], "monthly": []}

    total_spend = sum(t.amount for t in transactions)
    total_reward = sum(t.reward_earned for t in transactions)

    cat_map = {}
    for t in transactions:
        cat = t.category or "Other"
        if cat not in cat_map:
            cat_map[cat] = {"amount": 0.0, "reward": 0.0}
        cat_map[cat]["amount"] += t.amount
        cat_map[cat]["reward"] += t.reward_earned

    by_category = sorted([
        {"category": cat, "amount": round(d["amount"], 2),
         "percentage": round(d["amount"] / total_spend * 100, 1) if total_spend else 0,
         "reward": round(d["reward"], 2)}
        for cat, d in cat_map.items()
    ], key=lambda x: x["amount"], reverse=True)

    merch_map = {}
    for t in transactions:
        merch = t.merchant or t.description or "Unknown"
        if merch not in merch_map:
            merch_map[merch] = {"amount": 0.0, "reward": 0.0}
        merch_map[merch]["amount"] += t.amount
        merch_map[merch]["reward"] += t.reward_earned

    by_merchant = sorted([
        {"merchant": m, "amount": round(d["amount"], 2),
         "percentage": round(d["amount"] / total_spend * 100, 1) if total_spend else 0,
         "reward": round(d["reward"], 2)}
        for m, d in merch_map.items()
    ], key=lambda x: x["amount"], reverse=True)[:top_n_merchants]

    month_map = {}
    for t in transactions:
        key = (t.year, t.month)
        if key not in month_map:
            month_map[key] = {"spend": 0.0, "reward": 0.0, "cats": {}}
        month_map[key]["spend"] += t.amount
        month_map[key]["reward"] += t.reward_earned
        cat = t.category or "Other"
        month_map[key]["cats"][cat] = month_map[key]["cats"].get(cat, 0.0) + t.amount

    monthly = []
    for (yr, mo), data in sorted(month_map.items()):
        ms = data["spend"]
        monthly.append({
            "year": yr, "month": mo,
            "label": f"{calendar.month_abbr[mo]} {yr}",
            "total_spend": round(data["spend"], 2),
            "total_reward": round(data["reward"], 2),
            "by_category": sorted([
                {"category": c, "amount": round(a, 2),
                 "percentage": round(a / ms * 100, 1) if ms else 0, "reward": 0.0}
                for c, a in data["cats"].items()
            ], key=lambda x: x["amount"], reverse=True)
        })
    return {"total_spend": round(total_spend, 2), "total_reward": round(total_reward, 2),
            "by_category": by_category, "by_merchant": by_merchant, "monthly": monthly}
