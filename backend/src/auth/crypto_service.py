import base64
from typing import Union
from cryptography.fernet import Fernet
from backend.src.core.config import settings


class TokenEncryptionService:
    def __init__(self, key: Union[str, bytes, None] = None):
        if key is None:
            raw_key = settings.TOKEN_ENCRYPTION_KEY
        else:
            raw_key = key

        if isinstance(raw_key, str):
            # Check if key is a 64-char hex string (32 bytes hex)
            if len(raw_key) == 64 and all(c in "0123456789abcdefABCDEF" for c in raw_key):
                raw_bytes = bytes.fromhex(raw_key)
                fernet_key = base64.urlsafe_b64encode(raw_bytes)
            else:
                fernet_key = raw_key.encode("utf-8")
        elif isinstance(raw_key, bytes):
            if len(raw_key) == 32:
                fernet_key = base64.urlsafe_b64encode(raw_key)
            else:
                fernet_key = raw_key
        else:
            raise ValueError("Encryption key must be a string or bytes")

        self.fernet = Fernet(fernet_key)

    def encrypt_token(self, plain_token: str) -> str:
        if not plain_token:
            raise ValueError("Token cannot be empty")
        encrypted_bytes = self.fernet.encrypt(plain_token.encode("utf-8"))
        return encrypted_bytes.decode("utf-8")

    def decrypt_token(self, cipher_text: str) -> str:
        if not cipher_text:
            raise ValueError("Ciphertext cannot be empty")
        decrypted_bytes = self.fernet.decrypt(cipher_text.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
