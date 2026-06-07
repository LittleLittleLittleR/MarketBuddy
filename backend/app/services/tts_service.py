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
        model="gpt-4o-mini-tts",
        voice="coral",
        input=script,
        instructions="Speak like a confident, engaging financial news anchor. "
        "Keep the tone professional but conversational. Moderate pace.",
        response_format="mp3",
    ) as response:
        audio_bytes = await response.read()
        logger.success(f"[TTS] Done — {len(audio_bytes):,} bytes")
    return audio_bytes
