import os
import jwt
import httpx
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache

SUPABASE_URL = os.getenv("SUPABASE_URL")
security = HTTPBearer()

@lru_cache(maxsize=1)
def get_jwks():
    """Fetch Supabase public keys — cached so we don't hit it every request."""
    url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    response = httpx.get(url)
    response.raise_for_status()
    return response.json()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        # Get public keys from Supabase
        jwks = get_jwks()
        public_keys = jwt.PyJWKClient.__new__(jwt.PyJWKClient)
        
        # Decode header to get key id
        header = jwt.get_unverified_header(token)
        
        # Find matching key
        signing_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == header.get("kid"):
                signing_key = jwt.algorithms.ECAlgorithm.from_jwk(key)
                break
        
        if not signing_key:
            raise HTTPException(401, "No matching key found")
        
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["ES256"],
            options={"verify_aud": False}
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token")
        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired — please sign in again")
    except jwt.InvalidTokenError as e:
        raise HTTPException(401, f"Invalid token: {str(e)}")