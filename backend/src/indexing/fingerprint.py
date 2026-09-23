import hashlib


class ChecksumService:
    @staticmethod
    def compute_document_checksum(text: str) -> str:
        if not text:
            return hashlib.sha256(b"").hexdigest()
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    @staticmethod
    def compute_index_fingerprint(
        checksum: str,
        model_name: str,
        model_version: str,
        dim: int,
        chunk_size: int,
        chunk_overlap: int,
        preproc_version: str = "v1",
    ) -> str:
        raw_key = (
            f"{checksum}|{model_name}|{model_version}|{dim}|"
            f"{chunk_size}|{chunk_overlap}|{preproc_version}"
        )
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
