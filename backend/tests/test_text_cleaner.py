import pytest
from backend.src.indexing.cleaner import TextCleaningService


def test_remove_control_characters():
    cleaner = TextCleaningService()
    raw = "Hello\x00 World\x07!\x1f\tTab is kept\nNewline is kept."
    cleaned = cleaner.remove_control_chars(raw)
    assert "\x00" not in cleaned
    assert "\x07" not in cleaned
    assert "\x1f" not in cleaned
    assert "\t" in cleaned
    assert "\n" in cleaned
    assert "Hello World!" in cleaned


def test_normalize_whitespace():
    cleaner = TextCleaningService()
    raw = "This   has    too   many    spaces.\n\n\n\nAnd too many newlines."
    normalized = cleaner.normalize_whitespace(raw)
    assert "This has too many spaces." in normalized
    assert "\n\n\n" not in normalized


def test_strip_extraction_artifacts_hyphenation():
    cleaner = TextCleaningService()
    raw = "This is a demon-\nstration of de-hyphen-\nation for scientific papers."
    cleaned = cleaner.strip_extraction_artifacts(raw)
    assert "demonstration" in cleaned
    assert "de-hyphenation" in cleaned or "dehyphenation" in cleaned


def test_preserve_scientific_notation_and_symbols():
    cleaner = TextCleaningService()
    raw = "The result is 4.5 ± 0.2 μm, with α = 0.05 and β ≤ 10%. Formula: CO₂ + H₂O → H₂CO₃."
    cleaned = cleaner.clean(raw)
    assert "±" in cleaned
    assert "μm" in cleaned
    assert "α = 0.05" in cleaned
    assert "β ≤ 10%" in cleaned
    assert "CO₂" in cleaned
