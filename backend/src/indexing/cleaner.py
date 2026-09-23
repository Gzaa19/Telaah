import re


class TextCleaningService:
    def clean(self, raw_text: str) -> str:
        if not raw_text:
            return ""
        text = self.remove_control_chars(raw_text)
        text = self.strip_extraction_artifacts(text)
        text = self.normalize_whitespace(text)
        return text.strip()

    def remove_control_chars(self, text: str) -> str:
        if not text:
            return ""
        # Remove control characters except tab (\t = 9) and newline (\n = 10)
        return "".join(
            ch for ch in text
            if ord(ch) >= 32 or ch in ("\t", "\n")
        )

    def normalize_whitespace(self, text: str) -> str:
        if not text:
            return ""
        # Replace multiple spaces/tabs on the same line with single space
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
        text = "\n".join(lines)
        # Collapse 3 or more consecutive newlines into 2
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text

    def strip_extraction_artifacts(self, text: str) -> str:
        if not text:
            return ""
        # De-hyphenate words broken across newlines (e.g., "demon-\nstration" -> "demonstration")
        text = re.sub(r"(\b[a-zA-Z]+)-\n([a-zA-Z]+\b)", r"\1\2", text)

        # Remove common PDF pagination artifacts (e.g. "Page 1 of 12" or "Page 1")
        text = re.sub(r"(?i)\bpage\s+\d+(\s+of\s+\d+)?\b", "", text)

        return text
