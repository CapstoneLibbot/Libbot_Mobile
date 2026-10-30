"""Placeholder ASR for the Android text-uplink protocol.

Android SpeechRecognizer performs recognition on the kiosk and sends its final
text through ``listen/detect``. Xiaozhi still requires an ASR provider during
initialization, so this provider intentionally rejects any binary-audio client
instead of silently invoking an external ASR service.
"""

from typing import List, Optional, Tuple

from config.logger import setup_logging
from core.providers.asr.base import ASRProviderBase
from core.providers.asr.dto.dto import InterfaceType


logger = setup_logging()


class ASRProvider(ASRProviderBase):
    def __init__(self, config: dict, delete_audio_file: bool):
        self.interface_type = InterfaceType.NON_STREAM

    async def speech_to_text(
        self, opus_data: List[bytes], session_id: str, artifacts=None
    ) -> Tuple[Optional[str], Optional[str]]:
        logger.bind(tag=__name__).warning(
            "Ignored binary-audio ASR request: LiBot mobile uses text uplink only"
        )
        return "", None
