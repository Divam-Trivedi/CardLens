"""
Universal bank statement parser.
Works for any bank by using multiple strategies:
1. Pattern matching for known formats (Amex, BofA, Chase, Citi, etc.)
2. Heuristic line scanning
3. Table extraction fallback
4. AI-assisted extraction as last resort
"""
import pdfplumber
import re
from datetime import date, datetime
from typing import Optional, List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)

# ── Date patterns ──────────────────────────────────────────────────────────────
DATE_PATTERNS = [
    r'\d{2}/\d{2}/\d{4}',   # MM/DD/YYYY
    r'\d{2}/\d{2}/\d{2}',   # MM/DD/YY
    r'\d{2}-\d{2}-\d{4}',   # MM-DD-YYYY
    r'\d{4}-\d{2}-\d{2}',   # YYYY-MM-DD
    r'\d{2}\s+\w{3}\s+\d{4}', # DD Mon YYYY
    r'\w{3}\s+\d{2},?\s+\d{4}', # Mon DD, YYYY
    r'\d{2}\s+\w{3}',        # DD Mon (no year — needs year_hint)
]

# ── Period extraction patterns ─────────────────────────────────────────────────
PERIOD_PATTERNS = [
    # Amex
    (r'(?:closing date|statement date)[:\s]+(\d{2}/\d{2}/\d{4})', 'end_only'),
    # BofA
    (r'(\d{2}/\d{2}/\d{4})\s+through\s+(\d{2}/\d{2}/\d{4})', 'range'),
    # Chase
    (r'opening/closing date\s+(\d{2}/\d{2}/\d{2})\s*[-–]\s*(\d{2}/\d{2}/\d{2})', 'range'),
    # Generic range
    (r'(\d{2}/\d{2}/\d{4})\s*[-–to]+\s*(\d{2}/\d{2}/\d{4})', 'range'),
    (r'(\d{2}/\d{2}/\d{2})\s*[-–to]+\s*(\d{2}/\d{2}/\d{2})', 'range'),
    # Statement period with month names
    (r'(\w+ \d+,?\s*\d{4})\s*[-–to]+\s*(\w+ \d+,?\s*\d{4})', 'range_text'),
    # Single closing date
    (r'(?:closing|statement|billing)\s+(?:date|period)[:\s]+(\d{2}/\d{2}/\d{4})', 'end_only'),
    (r'(?:closing|statement|billing)\s+(?:date|period)[:\s]+(\d{2}/\d{2}/\d{2})', 'end_only'),
    # YYYY-MM-DD format
    (r'(\d{4}-\d{2}-\d{2})\s+(?:to|through|-)\s+(\d{4}-\d{2}-\d{2})', 'range_iso'),
]

# Lines to skip — not real transactions
SKIP_PATTERNS = [
    r'payment\s+(?:received|thank)',
    r'thank\s+you\s+for\s+(?:your\s+)?payment',
    r'previous\s+balance',
    r'new\s+balance',
    r'minimum\s+(?:payment|due)',
    r'credit\s+limit',
    r'available\s+credit',
    r'balance\s+transfer',
    r'cash\s+advance',
    r'interest\s+charge',
    r'annual\s+(?:fee|membership)',
    r'late\s+(?:fee|charge|payment)',
    r'statement\s+(?:closing|balance|credit)',
    r'opening\s+balance',
    r'rewards\s+(?:earned|redeemed|summary)',
    r'total\s+(?:purchases|payments|fees)',
    r'^page\s+\d',
    r'account\s+(?:number|summary|activity)',
]

SKIP_RE = [re.compile(p, re.IGNORECASE) for p in SKIP_PATTERNS]


def should_skip(description: str) -> bool:
    return any(p.search(description) for p in SKIP_RE)


def parse_statement_universal(filepath: str, bank_hint: str = None) -> Dict:
    """
    Main entry point. Tries multiple strategies to extract transactions.
    bank_hint: optional bank name to prefer certain parsing strategies.
    """
    transactions = []
    period_start = period_end = None

    try:
        with pdfplumber.open(filepath) as pdf:
            # Extract all text
            pages_text = []
            for page in pdf.pages:
                text = page.extract_text() or ""
                pages_text.append(text)
            full_text = "\n".join(pages_text)

            # Detect bank if not provided
            if not bank_hint:
                bank_hint = _detect_bank(full_text)
            logger.info(f"Parsing as bank: {bank_hint}")

            # Extract period
            period_start, period_end = _extract_period(full_text)
            year_hint = period_end.year if period_end else datetime.now().year

            # Strategy 1: Bank-specific parsers
            if bank_hint in ('amex', 'american express'):
                transactions = _parse_amex(full_text, year_hint)
            elif bank_hint in ('bofa', 'bank of america'):
                transactions = _parse_bofa(full_text, year_hint)
            elif bank_hint in ('chase',):
                transactions = _parse_chase(full_text, year_hint)
            elif bank_hint in ('citi', 'citibank'):
                transactions = _parse_citi(full_text, year_hint)

            # Strategy 2: Generic line scanner (works for most banks)
            if not transactions:
                transactions = _parse_generic(full_text, year_hint)

            # Strategy 3: Table extraction fallback
            if not transactions:
                logger.info("Falling back to table extraction")
                transactions = _parse_tables(pdf, year_hint)

            logger.info(f"Found {len(transactions)} transactions")

    except Exception as e:
        logger.error(f"Universal parser error: {e}", exc_info=True)

    return {
        "bank": bank_hint or "Unknown",
        "period_start": period_start,
        "period_end": period_end,
        "year": period_end.year if period_end else None,
        "month": period_end.month if period_end else None,
        "transactions": transactions
    }


def _detect_bank(text: str) -> str:
    """Detect bank from statement text."""
    text_lower = text.lower()
    banks = [
        ('american express', 'amex'),
        ('amex', 'amex'),
        ('bank of america', 'bofa'),
        ('chase', 'chase'),
        ('citibank', 'citi'),
        ('citi ', 'citi'),
        ('capital one', 'capital_one'),
        ('discover', 'discover'),
        ('wells fargo', 'wells_fargo'),
        ('us bank', 'us_bank'),
        ('td bank', 'td_bank'),
        ('synchrony', 'synchrony'),
        ('barclays', 'barclays'),
        ('hsbc', 'hsbc'),
        ('hdfc', 'hdfc'),
        ('icici', 'icici'),
        ('sbi', 'sbi'),
        ('axis bank', 'axis'),
        ('kotak', 'kotak'),
        ('standard chartered', 'standard_chartered'),
        ('lloyds', 'lloyds'),
        ('santander', 'santander'),
        ('rbc', 'rbc'),
        ('td canada', 'td_canada'),
        ('scotiabank', 'scotiabank'),
    ]
    for keyword, bank_id in banks:
        if keyword in text_lower:
            return bank_id
    return 'unknown'


def _extract_period(text: str) -> Tuple[Optional[date], Optional[date]]:
    """Extract statement period from text."""
    for pattern, mode in PERIOD_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if not m:
            continue
        try:
            if mode == 'end_only':
                end = _parse_date_str(m.group(1))
                return None, end
            elif mode in ('range', 'range_iso'):
                start = _parse_date_str(m.group(1))
                end = _parse_date_str(m.group(2))
                return start, end
            elif mode == 'range_text':
                start = _parse_date_str(m.group(1))
                end = _parse_date_str(m.group(2))
                return start, end
        except Exception:
            continue
    return None, None


def _parse_amex(text: str, year_hint: int) -> List[Dict]:
    """Amex-specific: date description amount on one line."""
    transactions = []
    for line in text.split('\n'):
        m = re.match(
            r'^(\d{2}/\d{2}/\d{2,4})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})\s*$',
            line.strip()
        )
        if m:
            try:
                amt = _parse_amount(m.group(3))
                if amt <= 0: continue
                desc = m.group(2).strip()
                if should_skip(desc): continue
                transactions.append({
                    "date": _parse_date_str(m.group(1), year_hint),
                    "description": desc,
                    "amount": amt,
                    "raw_text": line.strip()
                })
            except Exception:
                pass
    return transactions


def _parse_bofa(text: str, year_hint: int) -> List[Dict]:
    """BofA-specific scanner."""
    transactions = []
    for line in text.split('\n'):
        line = line.strip()
        m = re.match(r'^(\d{2}/\d{2}/\d{2,4})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s*$', line)
        if m:
            try:
                amt = _parse_amount(m.group(3))
                if amt <= 0: continue
                desc = m.group(2).strip()
                if should_skip(desc): continue
                transactions.append({
                    "date": _parse_date_str(m.group(1), year_hint),
                    "description": desc,
                    "amount": amt,
                    "raw_text": line
                })
            except Exception:
                pass
    return transactions


def _parse_chase(text: str, year_hint: int) -> List[Dict]:
    """Chase format: date description amount (sometimes on separate lines)."""
    transactions = []
    lines = text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        m = re.match(r'^(\d{2}/\d{2})\s+(.+?)(?:\s+(-?[\d,]+\.\d{2}))?$', line)
        if m:
            try:
                date_str = m.group(1)
                desc = m.group(2).strip()
                amount_str = m.group(3)

                # Amount might be on next line
                if not amount_str and i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if re.match(r'^-?[\d,]+\.\d{2}$', next_line):
                        amount_str = next_line
                        i += 1

                if amount_str:
                    amt = _parse_amount(amount_str)
                    if amt > 0 and not should_skip(desc):
                        txn_date = _parse_date_str(date_str + f"/{year_hint}", year_hint)
                        transactions.append({
                            "date": txn_date,
                            "description": desc,
                            "amount": amt,
                            "raw_text": line
                        })
            except Exception:
                pass
        i += 1
    return transactions


def _parse_citi(text: str, year_hint: int) -> List[Dict]:
    """Citi format similar to BofA."""
    return _parse_bofa(text, year_hint)  # Same format


def _parse_generic(text: str, year_hint: int) -> List[Dict]:
    """
    Generic scanner — tries every line against multiple date+amount patterns.
    Works for most banks including international ones.
    """
    transactions = []

    # Build a combined pattern that tries all date formats
    patterns = [
        # MM/DD/YYYY or MM/DD/YY at start
        r'^(\d{2}/\d{2}/\d{2,4})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s*$',
        # DD/MM/YYYY (European)
        r'^(\d{2}/\d{2}/\d{4})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s*$',
        # YYYY-MM-DD (ISO)
        r'^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s*$',
        # DD Mon YYYY (e.g. 15 Jan 2025)
        r'^(\d{2}\s+\w{3}\s+\d{4})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s*$',
        # DD-Mon-YY (e.g. 15-Jan-25) — common in Indian banks
        r'^(\d{2}-\w{3}-\d{2,4})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s*$',
        # Date at end: description amount date
        r'^(.+?)\s+(-?[\d,]+\.\d{2})\s+(\d{2}/\d{2}/\d{2,4})\s*$',
    ]

    for line in text.split('\n'):
        line = line.strip()
        if not line or len(line) < 10:
            continue

        for pat_idx, pattern in enumerate(patterns):
            m = re.match(pattern, line, re.IGNORECASE)
            if m:
                try:
                    if pat_idx < 5:
                        date_str, desc, amount_str = m.group(1), m.group(2), m.group(3)
                    else:
                        # Date at end pattern
                        desc, amount_str, date_str = m.group(1), m.group(2), m.group(3)

                    amt = _parse_amount(amount_str)
                    if amt <= 0: continue
                    desc = desc.strip()
                    if should_skip(desc): continue
                    if len(desc) < 2: continue

                    txn_date = _parse_date_str(date_str, year_hint)
                    transactions.append({
                        "date": txn_date,
                        "description": desc,
                        "amount": amt,
                        "raw_text": line
                    })
                    break  # Found a match, don't try other patterns
                except Exception:
                    pass

    # Deduplicate by (date, description, amount)
    seen = set()
    unique = []
    for t in transactions:
        key = (str(t['date']), t['description'][:30], t['amount'])
        if key not in seen:
            seen.add(key)
            unique.append(t)

    return unique


def _parse_tables(pdf, year_hint: int) -> List[Dict]:
    """Table-based extraction — last resort."""
    transactions = []
    for page in pdf.pages:
        for table in (page.extract_tables() or []):
            for row in table:
                if not row or len(row) < 2:
                    continue
                row_str = [str(c or '').strip() for c in row]

                # Find date cell
                date_cell = None
                date_idx = None
                for idx, cell in enumerate(row_str):
                    if re.match(r'\d{2}[/\-]\d{2}[/\-]\d{2,4}', cell):
                        date_cell = cell
                        date_idx = idx
                        break

                if not date_cell:
                    continue

                # Find amount cell (rightmost numeric)
                amount_cell = None
                for cell in reversed(row_str):
                    if re.match(r'-?[\d,]+\.\d{2}$', cell.replace('$', '').replace(',', '').strip()):
                        amount_cell = cell
                        break

                if not amount_cell:
                    continue

                # Description is everything between date and amount
                desc_parts = [c for i, c in enumerate(row_str)
                              if c and i != date_idx and c != amount_cell]
                desc = ' '.join(desc_parts).strip()

                try:
                    amt = _parse_amount(amount_cell)
                    if amt <= 0: continue
                    if should_skip(desc): continue
                    transactions.append({
                        "date": _parse_date_str(date_cell, year_hint),
                        "description": desc or "Unknown",
                        "amount": amt,
                        "raw_text": ' | '.join(row_str)
                    })
                except Exception:
                    pass
    return transactions


def _parse_date_str(s: str, year_hint: int = None) -> date:
    """Parse any date string format into a date object."""
    s = s.strip().rstrip(',').replace('  ', ' ')

    formats = [
        "%m/%d/%Y", "%m/%d/%y",
        "%d/%m/%Y", "%d/%m/%y",
        "%Y-%m-%d",
        "%d-%m-%Y", "%d-%m-%y",
        "%d %b %Y", "%d %B %Y",
        "%b %d %Y", "%B %d %Y",
        "%d-%b-%Y", "%d-%b-%y",
        "%d-%B-%Y",
        "%m/%d",    # MM/DD — needs year_hint
        "%d/%m",    # DD/MM — needs year_hint
        "%d %b",    # DD Mon — needs year_hint
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(s, fmt)
            if dt.year == 1900 and year_hint:
                dt = dt.replace(year=year_hint)
            return dt.date()
        except ValueError:
            continue

    raise ValueError(f"Cannot parse date: {s!r}")


def _parse_amount(s: str) -> float:
    """Parse amount string, handling various formats including international."""
    s = str(s).strip()
    # Remove currency symbols and spaces
    s = re.sub(r'[£€¥₹$\s]', '', s)
    # Handle CR/DR suffixes (credit/debit in some bank formats)
    is_credit = s.endswith(('CR', 'C'))
    s = re.sub(r'(CR|DR|C|D)$', '', s, flags=re.IGNORECASE)
    # Remove commas (thousands separator)
    s = s.replace(',', '')
    val = float(s)
    if is_credit:
        val = -val  # Credits are negative (payments)
    return val
