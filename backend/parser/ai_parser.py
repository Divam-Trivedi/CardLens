import os, json, re, logging
from typing import List, Dict
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

CATEGORY_LIST = ["Supermarkets","Wholesale Clubs","Dining","Fast Food","Coffee","Gas Stations",
    "Online Shopping","Travel","Hotels","Airlines","Transportation","Streaming","Subscriptions",
    "Drug Stores","Home Improvement","Electronics","Clothing","Healthcare","Entertainment","Education","Utilities","Insurance","Other"]

async def enrich_transactions(transactions, card_id):
    if not OPENAI_API_KEY:
        logger.warning("No OPENAI_API_KEY set — using rule-based fallback only")
        return transactions
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    enriched = []
    for i in range(0, len(transactions), 40):
        batch = transactions[i:i+40]
        try:
            enriched.extend(await _enrich_batch(client, batch))
        except Exception as e:
            logger.warning(f"AI enrichment failed: {e}")
            enriched.extend(batch)
    return enriched

async def _enrich_batch(client, transactions):
    txn_list = [{"index": i, "description": t["description"], "amount": t["amount"]} for i, t in enumerate(transactions)]
    prompt = f"""Categorize each transaction. For each give merchant (clean name) and category from: {', '.join(CATEGORY_LIST)}
Transactions: {json.dumps(txn_list)}
Respond ONLY with a JSON array: [{{"index":0,"merchant":"...","category":"..."}}]"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2000,
        temperature=0
    )
    content = response.choices[0].message.content.strip()
    content = re.sub(r'```[a-z]*\n?', '', content).strip()
    enrichment_map = {e["index"]: e for e in json.loads(content)}
    result = []
    for i, txn in enumerate(transactions):
        enriched = dict(txn)
        if i in enrichment_map:
            enriched["merchant"] = enrichment_map[i].get("merchant", txn["description"])
            enriched["category"] = enrichment_map[i].get("category", "Other")
        else:
            enriched["merchant"] = txn["description"]
            enriched["category"] = "Other"
        result.append(enriched)
    return result

def rule_based_categorize(description, merchant_map):
    desc_upper = description.upper()
    for keyword, category in merchant_map.items():
        if keyword.upper() in desc_upper:
            return keyword.title(), category
    return description, "Other"