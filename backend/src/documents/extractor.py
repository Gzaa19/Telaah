import io
from dataclasses import dataclass
from typing import List, Dict, Any, Union
import pdfplumber
from docx import Document as DocxDocument
from pdfminer.pdfdocument import PDFPasswordIncorrect

from backend.src.documents.models import FileType


class ScannedPDFError(Exception):
    """Raised when PDF lacks extractable text (likely a scanned image)."""
    pass


class EncryptedPDFError(Exception):
    """Raised when PDF is password-protected."""
    pass


class UnsupportedFileTypeError(Exception):
    """Raised when file type is not supported for text extraction."""
    pass


@dataclass
class ExtractionResult:
    full_text: str
    total_pages: int
    pages: List[Dict[str, Any]]


class TextExtractor:
    def extract_text(
        self,
        file_bytes_or_stream: Union[bytes, io.BytesIO, Any],
        file_type: Union[str, FileType],
    ) -> ExtractionResult:
        if isinstance(file_type, FileType):
            type_str = file_type.value
        else:
            type_str = str(file_type).lower()

        if type_str == "pdf":
            return self._extract_pdf(file_bytes_or_stream)
        elif type_str == "docx":
            return self._extract_docx(file_bytes_or_stream)
        else:
            raise UnsupportedFileTypeError(f"Unsupported file type: {type_str}. Only PDF and DOCX are supported.")

    def _extract_pdf(self, file_bytes_or_stream: Union[bytes, io.BytesIO, Any]) -> ExtractionResult:
        if isinstance(file_bytes_or_stream, bytes):
            stream = io.BytesIO(file_bytes_or_stream)
        else:
            stream = file_bytes_or_stream

        try:
            with pdfplumber.open(stream) as pdf:
                total_pages = len(pdf.pages)
                if total_pages == 0:
                    raise ScannedPDFError("PDF contains 0 pages.")

                pages_data: List[Dict[str, Any]] = []
                empty_pages_count = 0

                for idx, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    cleaned_text = text.strip()

                    if len(cleaned_text) < 50:
                        empty_pages_count += 1

                    pages_data.append({
                        "page_number": idx + 1,
                        "content": cleaned_text,
                    })

                # If more than 50% of pages have less than 50 characters, treat as scanned PDF
                if (empty_pages_count / total_pages) > 0.5:
                    raise ScannedPDFError("PDF does not contain extractable text (likely a scanned image).")

                full_text = "\n\n".join(p["content"] for p in pages_data if p["content"])
                return ExtractionResult(
                    full_text=full_text,
                    total_pages=total_pages,
                    pages=pages_data,
                )
        except PDFPasswordIncorrect as e:
            raise EncryptedPDFError("PDF is password-protected.") from e

    def _extract_docx(self, file_bytes_or_stream: Union[bytes, io.BytesIO, Any]) -> ExtractionResult:
        if isinstance(file_bytes_or_stream, bytes):
            stream = io.BytesIO(file_bytes_or_stream)
        else:
            stream = file_bytes_or_stream

        doc = DocxDocument(stream)
        sections: List[Dict[str, str]] = []

        for para in doc.paragraphs:
            text = para.text.strip()
            if text:
                style_name = para.style.name if para.style else "Normal"
                sections.append({"style": style_name, "text": text})

        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(c.text.strip() for c in row.cells if c.text.strip())
                if row_text.strip():
                    sections.append({"style": "Table", "text": row_text})

        if not sections:
            # Empty DOCX
            return ExtractionResult(
                full_text="",
                total_pages=1,
                pages=[{"page_number": 1, "content": ""}],
            )

        full_text = "\n\n".join(s["text"] for s in sections)

        # For DOCX, group sections into logical page/section units
        pages_data: List[Dict[str, Any]] = []
        current_page_content: List[str] = []
        page_num = 1

        for s in sections:
            current_page_content.append(s["text"])
            # Split page every ~10 paragraphs/tables or if heading starts
            if len(current_page_content) >= 10 or s["style"].startswith("Heading"):
                pages_data.append({
                    "page_number": page_num,
                    "content": "\n\n".join(current_page_content),
                })
                page_num += 1
                current_page_content = []

        if current_page_content:
            pages_data.append({
                "page_number": page_num,
                "content": "\n\n".join(current_page_content),
            })

        return ExtractionResult(
            full_text=full_text,
            total_pages=len(pages_data),
            pages=pages_data,
        )
