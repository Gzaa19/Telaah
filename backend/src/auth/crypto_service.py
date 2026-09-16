import base64
from typing import Union, Optional
from cryptography.fernet import Fernet
from backend.src.core.config import settings


def _resolve_fernet_key(key: Union[str, bytes]) -> bytes:
    if isinstance(key, str):
        if len(key) == 64 and all(c in "0123456789abcdefABCDEF" for c in key):
            return base64.urlsafe_b64encode(bytes.fromhex(key))
        return key.encode("utf-8")
    return base64.urlsafe_b64encode(key) if len(key) == 32 else key


class TokenEncryptionService:
    def __init__(self, key: Optional[Union[str, bytes]] = None):
        raw_key = key or settings.TOKEN_ENCRYPTION_KEY
        self.fernet = Fernet(_resolve_fernet_key(raw_key))

    def encrypt_token(self, token: str) -> str:
        if not token:
            raise ValueError("Token cannot be empty")
        return self.fernet.encrypt(token.encode("utf-8")).decode("utf-8")

    def decrypt_token(self, cipher_text: str) -> str:
        if not cipher_text:
            raise ValueError("Ciphertext cannot be empty")
        return self.fernet.decrypt(cipher_text.encode("utf-8")).decode("utf-8")
