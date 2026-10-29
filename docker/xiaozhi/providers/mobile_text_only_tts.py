"""Text-only TTS provider for LiBot Android.

The Android client renders every TTS text event with its local ``vi-VN`` engine.
Avoiding EdgeTTS here removes cloud retries and binary Opus playback from the
mobile conversational path while preserving Xiaozhi's normal TTS lifecycle.
"""

from core.providers.tts.base import TTSProviderBase
from core.providers.tts.dto.dto import SentenceType


class TTSProvider(TTSProviderBase):
    async def text_to_speak(self, text, output_file):
        """Satisfy the upstream provider contract; Android renders the text."""
        return None

    def to_tts_stream(self, text, opus_handler=None) -> None:
        if not text:
            return
        self.tts_audio_queue.put(
            (SentenceType.FIRST, None, text, getattr(self, "current_sentence_id", None))
        )
