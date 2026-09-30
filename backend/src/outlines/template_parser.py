import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import yaml
import docx


class TemplateNotFoundError(Exception):
    """Raised when a template directory or its required files cannot be found."""
    pass


class TemplateParsingError(Exception):
    """Raised when a template file is corrupt or cannot be parsed."""
    pass


class NormalizedField(BaseModel):
    field_key: str
    field_label: str
    guidance_notes: str
    order_index: int


class NormalizedSection(BaseModel):
    section_key: str
    title: str
    order_index: int
    is_required: bool
    fields: List[NormalizedField] = []


class OutlineDefinition(BaseModel):
    template_id: str
    name: str
    target_venue: str
    latex_export_config: Dict[str, Any] = {}
    sections: List[NormalizedSection] = []


class TemplateParser:
    def __init__(self, template_base_path: Optional[str] = None):
        if template_base_path:
            self.base_path = Path(template_base_path)
        else:
            # Default to backend/src/templates
            current_dir = Path(__file__).resolve().parent
            self.base_path = current_dir.parent / "templates"

    def _validate_files(self, template_dir: Path) -> None:
        if not template_dir.exists() or not template_dir.is_dir():
            raise TemplateNotFoundError(f"Template directory does not exist: {template_dir}")

        required_files = ["template.docx", "template.tex", "outline-sections.yaml"]
        missing = [f for f in required_files if not (template_dir / f).exists()]
        if missing:
            raise TemplateNotFoundError(
                f"Missing required template files in {template_dir}: {', '.join(missing)}"
            )

    def _parse_docx_headings(self, docx_path: Path) -> List[str]:
        headings = []
        try:
            doc = docx.Document(docx_path)
            for p in doc.paragraphs:
                text = p.text.strip()
                if not text:
                    continue
                is_heading_style = p.style and "heading" in p.style.name.lower()
                is_roman_heading = bool(re.match(r"^(?:[I|V|X]+)\.\s+[A-Z\s]+$", text))
                if is_heading_style or is_roman_heading:
                    headings.append(text)
        except Exception:
            # Robust fallback for IEEE transitional namespaces (purl.oclc.org / older ECMA-376)
            try:
                import zipfile
                import xml.etree.ElementTree as ET

                with zipfile.ZipFile(docx_path, "r") as z:
                    if "word/document.xml" in z.namelist():
                        root = ET.fromstring(z.read("word/document.xml"))
                        w_ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                        for p in root.iter(f"{{{w_ns}}}p"):
                            texts = [node.text for node in p.iter(f"{{{w_ns}}}t") if node.text]
                            full_text = "".join(texts).strip()
                            if full_text and (
                                bool(re.match(r"^(?:[I|V|X]+)\.\s+[A-Z\s]+$", full_text))
                                or full_text in ["Abstract", "Index Terms", "Keywords", "References", "Acknowledgment"]
                            ):
                                headings.append(full_text)
            except Exception as e:
                raise TemplateParsingError(f"Failed to read DOCX template: {e}")
        return headings

    def _parse_latex_export_config(self, tex_path: Path) -> Dict[str, Any]:
        try:
            with open(tex_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            raise TemplateParsingError(f"Failed to read LaTeX template: {e}")

        doc_class_match = re.search(r"\\documentclass(?:\[(.*?)\])?\{(.*?)\}", content)
        bib_style_match = re.search(r"\\bibliographystyle\{(.*?)\}", content)

        return {
            "document_class": doc_class_match.group(2) if doc_class_match else "IEEEtran",
            "document_class_options": doc_class_match.group(1) if doc_class_match and doc_class_match.group(1) else "conference",
            "bibliography_style": bib_style_match.group(1) if bib_style_match else "IEEEtran",
        }

    def _parse_yaml_config(self, yaml_path: Path) -> Dict[str, Any]:
        try:
            with open(yaml_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            if not isinstance(data, dict):
                raise ValueError("YAML content must be a dictionary")
            return data
        except Exception as e:
            raise TemplateParsingError(f"Failed to parse outline-sections.yaml: {e}")

    def parse_template(self, template_id: str) -> OutlineDefinition:
        template_dir = self.base_path / template_id
        self._validate_files(template_dir)

        docx_path = template_dir / "template.docx"
        tex_path = template_dir / "template.tex"
        yaml_path = template_dir / "outline-sections.yaml"

        _ = self._parse_docx_headings(docx_path)
        latex_config = self._parse_latex_export_config(tex_path)
        yaml_config = self._parse_yaml_config(yaml_path)

        raw_sections = yaml_config.get("sections", [])
        normalized_sections: List[NormalizedSection] = []

        for idx, sec in enumerate(raw_sections, start=1):
            fields_data = sec.get("fields", [])
            normalized_fields: List[NormalizedField] = []
            for f_idx, f in enumerate(fields_data, start=1):
                normalized_fields.append(
                    NormalizedField(
                        field_key=f["key"],
                        field_label=f["label"],
                        guidance_notes=f.get("guidance", ""),
                        order_index=f.get("order", f_idx),
                    )
                )

            normalized_sections.append(
                NormalizedSection(
                    section_key=sec["key"],
                    title=sec["title"],
                    order_index=sec.get("order", idx),
                    is_required=sec.get("is_required", True),
                    fields=normalized_fields,
                )
            )

        # Sort sections strictly by order_index
        normalized_sections.sort(key=lambda s: s.order_index)

        return OutlineDefinition(
            template_id=template_id,
            name=yaml_config.get("name", template_id),
            target_venue=yaml_config.get("target_venue", ""),
            latex_export_config=latex_config,
            sections=normalized_sections,
        )
