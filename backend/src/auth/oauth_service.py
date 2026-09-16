import secrets
import urllib.parse
from typing import Tuple, Optional
import httpx

from backend.src.core.config import settings
from backend.src.auth.schemas import GoogleProfileDTO, OAuthTokenDTO


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

DEFAULT_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/drive.readonly",
]


class GoogleOAuthService:
    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        redirect_uri: Optional[str] = None,
    ):
        self.client_id = client_id or settings.GOOGLE_CLIENT_ID
        self.client_secret = client_secret or settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = redirect_uri or settings.GOOGLE_REDIRECT_URI

    def generate_authorization_url(self, prompt: str = "consent") -> Tuple[str, str]:
        state = secrets.token_urlsafe(32)
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(DEFAULT_SCOPES),
            "access_type": "offline",
            "prompt": prompt,
            "state": state,
        }
        query_string = urllib.parse.urlencode(params)
        auth_url = f"{GOOGLE_AUTH_URL}?{query_string}"
        return auth_url, state

    def exchange_code(self, code: str) -> OAuthTokenDTO:
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri,
        }
        response = httpx.post(GOOGLE_TOKEN_URL, data=data, timeout=10.0)
        if response.status_code != 200:
            raise ValueError(f"Failed to exchange authorization code: {response.text}")

        token_data = response.json()
        return OAuthTokenDTO(
            access_token=token_data.get("access_token"),
            refresh_token=token_data.get("refresh_token"),
            expires_in=token_data.get("expires_in", 3600),
            scope=token_data.get("scope", ""),
        )

    def fetch_user_profile(self, access_token: str) -> GoogleProfileDTO:
        headers = {"Authorization": f"Bearer {access_token}"}
        response = httpx.get(GOOGLE_USERINFO_URL, headers=headers, timeout=10.0)
        if response.status_code != 200:
            raise ValueError(f"Failed to fetch user profile: {response.text}")

        user_data = response.json()
        return GoogleProfileDTO(
            email=user_data.get("email"),
            full_name=user_data.get("name") or user_data.get("email", ""),
            avatar_url=user_data.get("picture"),
        )

    @staticmethod
    def check_drive_scope_granted(scope_string: str) -> bool:
        if not scope_string:
            return False
        scopes = scope_string.split()
        return any(
            "drive.readonly" in s or "auth/drive" in s
            for s in scopes
        )
