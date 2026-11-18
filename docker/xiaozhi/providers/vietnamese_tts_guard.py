"""Last-resort language guard for Xiaozhi text sent to TTS."""

from __future__ import annotations

import re


_CJK = re.compile(r"[\u3400-\u9fff\uf900-\ufaff]")
_INTERNAL_TOOL = re.compile(
    r"^\s*[%/\s]*(search_books|start_book_guidance)\b.*$",
    re.IGNORECASE,
)
_FALLBACK = "LiBot chưa thể trả lời bằng tiếng Việt. Bạn vui lòng nói lại."


def sanitize_tts_text(value: object) -> str:
    """Keep Chinese/model-tool artifacts out of the kiosk TTS stream."""
    text = str(value or "").strip()
    if not text or _CJK.search(text) or _INTERNAL_TOOL.match(text):
        return _FALLBACK
    return text
