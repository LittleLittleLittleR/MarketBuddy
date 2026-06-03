from openai import AsyncOpenAI
from loguru import logger
from app.config import settings

llm_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def generate_audio(script: str, voice: str = "nova") -> bytes:
    """
    Convert a text script into mp3 audio bytes via OpenAI TTS.
    """
    logger.info(f"[TTS] Generating audio — {len(script)} chars, voice={voice}")

    async with llm_client.audio.speech.with_streaming_response.create(
        model="tts-1",  # tts-1-hd for higher quality if needed
        voice=voice,
        input=script,
        response_format="mp3",
    ) as response:
        audio_bytes = await response.read()

    logger.success(f"[TTS] Done — {len(audio_bytes):,} bytes")
    return audio_bytes
