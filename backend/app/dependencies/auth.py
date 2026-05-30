import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

security = HTTPBearer()

SUPABASE_URL = settings.SUPABASE_URL
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

jwk_client = jwt.PyJWKClient(JWKS_URL)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        signing_key = jwk_client.get_signing_key_from_jwt(token)

        # decode and verify using the ES256 algorithm (corresponds to ECC P-256)
        payload = jwt.decode(
            token, signing_key.key, algorithms=["ES256"], options={"verify_aud": False}
        )
        # print(f"User {payload.get("email")} requested analysis for tickers!")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired"
        )
    except (jwt.InvalidTokenError, Exception):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
