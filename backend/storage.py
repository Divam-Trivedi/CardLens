import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def upload_pdf(user_id: str, filename: str, file_bytes: bytes) -> str:
    """Upload PDF to Supabase Storage, returns storage path."""
    supabase = get_supabase()
    path = f"{user_id}/{filename}"
    supabase.storage.from_("statements").upload(
        path, file_bytes, {"content-type": "application/pdf", "upsert": "true"}
    )
    return path

def get_pdf_url(storage_path: str) -> str:
    """Get a short-lived signed URL for a PDF (1 hour expiry)."""
    supabase = get_supabase()
    res = supabase.storage.from_("statements").create_signed_url(storage_path, 3600)
    return res["signedURL"]

def delete_pdf(storage_path: str):
    supabase = get_supabase()
    supabase.storage.from_("statements").remove([storage_path])