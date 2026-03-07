import pdfplumber
import re
from datetime import date, datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)

def parse_bofa_statement(filepath):
    transactions = []
    period_start = period_end = None

    try:
        with pdfplumber.open(filepath) as pdf:
            full_text = "\n".join(p.extract_text() or "" for p in pdf.pages)

            # Try multiple date range formats
            patterns = [
                r'(\d{2}/\d{2}/\d{4})\s+through\s+(\d{2}/\d{2}/\d{4})',
                r'(\d{2}/\d{2}/\d{4})\s*-\s*(\d{2}/\d{2}/\d{4})',
                r'Opening Date[:\s]+(\d{2}/\d{2}/\d{4}).*?Closing Date[:\s]+(\d{2}/\d{2}/\d{4})',
                r'Statement Period[:\s]+(\d{2}/\d{2}/\d{4})\s+to\s+(\d{2}/\d{2}/\d{4})',
            ]
            for pattern in patterns:
                m = re.search(pattern, full_text, re.IGNORECASE | re.DOTALL)
                if m:
                    try:
                        period_start = datetime.strptime(m.group(1), "%m/%d/%Y").date()
                        period_end = datetime.strptime(m.group(2), "%m/%d/%Y").date()
                        break
                    except:
                        pass

            # If still no period, try to find any date that looks like a closing date
            if not period_end:
                m = re.search(r'(?:closing|statement)\s+date[:\s]+(\d{2}/\d{2}/\d{4})', full_text, re.IGNORECASE)
                if m:
                    try:
                        period_end = datetime.strptime(m.group(1), "%m/%d/%Y").date()
                    except:
                        pass

            year_hint = period_end.year if period_end else datetime.now().year

            # Scan every line for transactions — don't require being in a specific section
            skip_keywords = [
                'payment', 'thank you', 'credit adjustment', 'balance transfer',
                'minimum payment', 'previous balance', 'new balance', 'credit limit',
                'available credit', 'statement closing'
            ]

            for line in full_text.split('\n'):
                line = line.strip()
                if not line:
                    continue

                # Match lines starting with a date
                match = re.match(
                    r'^(\d{2}/\d{2}/\d{2,4})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s*$',
                    line
                )
                if match:
                    try:
                        desc = match.group(2).strip()
                        # Skip non-purchase lines
                        if any(k in desc.lower() for k in skip_keywords):
                            continue
                        amt = _parse_amount(match.group(3))
                        if amt <= 0:
                            continue
                        txn_date = _parse_date(match.group(1), year_hint)
                        transactions.append({
                            "date": txn_date,
                            "description": desc,
                            "amount": amt,
                            "raw_text": line
                        })
                    except Exception as e:
                        logger.debug(f"Skip line: {line} — {e}")

            # Fallback: table extraction
            if not transactions:
                logger.info("Falling back to table extraction for BofA")
                with pdfplumber.open(filepath) as pdf2:
                    for page in pdf2.pages:
                        for table in (page.extract_tables() or []):
                            for row in table:
                                if not row or len(row) < 2:
                                    continue
                                dm = re.match(r'\d{2}/\d{2}/\d{2,4}', str(row[0] or ""))
                                if dm:
                                    try:
                                        amt = _parse_amount(str(row[-1] or ""))
                                        if amt > 0:
                                            transactions.append({
                                                "date": _parse_date(dm.group(), year_hint),
                                                "description": str(row[1] or "").strip(),
                                                "amount": amt,
                                                "raw_text": "|".join(str(c) for c in row if c)
                                            })
                                    except:
                                        pass

    except Exception as e:
        logger.error(f"BofA parse error: {e}")

    logger.info(f"BofA parser found {len(transactions)} transactions")
    return {
        "bank": "Bank of America",
        "period_start": period_start,
        "period_end": period_end,
        "year": period_end.year if period_end else None,
        "month": period_end.month if period_end else None,
        "transactions": transactions
    }

def _parse_date(s, year_hint=None):
    for fmt in ["%m/%d/%Y", "%m/%d/%y"]:
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except:
            pass
    raise ValueError(f"Cannot parse: {s}")

def _parse_amount(s):
    cleaned = re.sub(r'[$,\s]', '', str(s))
    if not cleaned or cleaned == '-':
        raise ValueError("Empty amount")
    return float(cleaned)