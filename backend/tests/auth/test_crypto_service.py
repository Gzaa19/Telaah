import pytest
from cryptography.fernet import Fernet
from backend.src.auth.crypto_service import TokenEncryptionService


def test_encrypt_and_decrypt_token():
    key = Fernet.generate_key().decode()
    service = TokenEncryptionService(key=key)

    raw_token = "ya29.a0AfH6SMA..."
    encrypted = service.encrypt_token(raw_token)

    assert encrypted != raw_token
    assert isinstance(encrypted, str)

    decrypted = service.decrypt_token(encrypted)
    assert decrypted == raw_token


def test_decrypt_invalid_token():
    key = Fernet.generate_key().decode()
    service = TokenEncryptionService(key=key)

    with pytest.raises(Exception):
        service.decrypt_token("invalid-ciphertext")


def test_support_hex_key():
    # 32 bytes in hex = 64 characters
    hex_key = "94cbf037b51293a61f43501a2f6468923058869c991ba90f2305718a381023a1"
    service = TokenEncryptionService(key=hex_key)

    raw_token = "refresh_token_xyz"
    encrypted = service.encrypt_token(raw_token)
    assert encrypted != raw_token
    assert service.decrypt_token(encrypted) == raw_token
