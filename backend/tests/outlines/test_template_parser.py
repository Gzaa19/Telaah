import os
import pytest
from backend.src.outlines.template_parser import TemplateParser, TemplateNotFoundError


def test_parse_template_icicos():
    parser = TemplateParser()
    definition = parser.parse_template("icicos")

    assert definition is not None
    assert definition.template_id == "icicos"
    assert len(definition.sections) >= 5

    # Check key mandatory sections
    section_keys = [s.section_key for s in definition.sections]
    assert "abstract" in section_keys
    assert "introduction" in section_keys
    assert "methodology" in section_keys
    assert "results" in section_keys
    assert "conclusion" in section_keys

    # Check Introduction fields
    intro_sec = next(s for s in definition.sections if s.section_key == "introduction")
    field_keys = [f.field_key for f in intro_sec.fields]
    assert "background" in field_keys
    assert "problem_statement" in field_keys
    assert "research_gap" in field_keys
    assert "objective" in field_keys


def test_missing_file_failure(tmp_path):
    parser = TemplateParser(template_base_path=str(tmp_path))
    with pytest.raises(TemplateNotFoundError):
        parser.parse_template("non_existent_template")


def test_docx_yaml_normalization():
    parser = TemplateParser()
    definition = parser.parse_template("icicos")

    # Order should be strictly monotonically increasing
    orders = [s.order_index for s in definition.sections]
    assert orders == sorted(orders)
    assert len(orders) == len(set(orders))
