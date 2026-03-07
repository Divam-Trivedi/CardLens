import pdfplumber, re
from datetime import date, datetime
from typing import List, Dict, Optional
import logging
logger = logging.getLogger(__name__)

def parse_amex_statement(filepath):
    transactions = []
    period_start = period_end = None
    try:
        with pdfplumber.open(filepath) as pdf:
            full_text = "\n".join(p.extract_text() or "" for p in pdf.pages)
            m = re.search(r'(\d{2}/\d{2}/\d{2,4})\s+to\s+(\d{2}/\d{2}/\d{2,4})', full_text, re.IGNORECASE)
            if m:
                try:
                    period_start = _parse_date(m.group(1))
                    period_end = _parse_date(m.group(2))
                except: pass
            m2 = re.search(r'(?:Closing Date|Statement Period)[:\s]+(\w+ \d+,?\s*\d{4})', full_text, re.IGNORECASE)
            if m2 and not period_end:
                try: period_end = datetime.strptime(m2.group(1).replace(",",""), "%B %d %Y").date()
                except: pass
            year_hint = period_end.year if period_end else datetime.now().year
            for match in re.finditer(r'^(\d{2}/\d{2}/\d{2,4})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})\s*$', full_text, re.MULTILINE):
                try:
                    amt = _parse_amount(match.group(3))
                    if amt <= 0: continue
                    transactions.append({"date": _parse_date(match.group(1), year_hint), "description": match.group(2).strip(), "amount": amt, "raw_text": match.group(0)})
                except: pass
            if not transactions:
                for page in pdf.pages:
                    for table in (page.extract_tables() or []):
                        for row in table:
                            if not row or len(row) < 3: continue
                            dm = re.match(r'\d{2}/\d{2}/\d{2,4}', str(row[0] or ""))
                            if dm:
                                try:
                                    amt = _parse_amount(str(row[-1] or ""))
                                    if amt > 0:
                                        transactions.append({"date": _parse_date(dm.group(), year_hint), "description": str(row[1] or "").strip(), "amount": amt, "raw_text": "|".join(str(c) for c in row if c)})
                                except: pass
    except Exception as e:
        logger.error(f"Amex parse error: {e}")
    return {"bank": "American Express", "period_start": period_start, "period_end": period_end,
            "year": period_end.year if period_end else None, "month": period_end.month if period_end else None, "transactions": transactions}

def _parse_date(s, year_hint=None):
    for fmt in ["%m/%d/%Y", "%m/%d/%y"]:
        try: return datetime.strptime(s.strip(), fmt).date()
        except: pass
    raise ValueError(f"Cannot parse date: {s}")

def _parse_amount(s):
    return float(re.sub(r'[$,\s]', '', s))
