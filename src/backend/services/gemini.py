# services/gemini_client.py
import os, base64, time
from typing import List, Optional
from google import genai
from google.genai import types

# Model defaults – adjust as you wish (you can also set GEMINI_MODEL in .env)
_GEMINI_MODEL_DEFAULT = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")

_client = None
def get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ["GEMINI_API_KEY"]  # <-- your convention
        _client = genai.Client(api_key=api_key)
    return _client

def part_text(text: str) -> types.Part:
    return types.Part.from_text(text)

def part_image_url(url: str, mime_type: str = "image/png") -> types.Part:
    return types.Part.from_uri(file_uri=url, mime_type=mime_type)

def part_image_b64(b64_str: str, mime_type: str = "image/png") -> types.Part:
    raw = base64.b64decode(b64_str)
    return types.Part.from_bytes(data=raw, mime_type=mime_type)

def _make_config(
    system_instruction: Optional[str],
    json_mode: bool,
    temperature: float,
    top_p: float,
    max_output_tokens: int,
    seed: Optional[int] = None,
):
    return types.GenerateContentConfig(
        temperature=temperature,
        top_p=top_p,
        max_output_tokens=max_output_tokens,
        response_mime_type="application/json" if json_mode else None,
        system_instruction=types.Part.from_text(system_instruction) if system_instruction else None,
        seed=seed,
        # media_resolution="MEDIA_RESOLUTION_HIGH",  # enable if you want
    )

def generate_once(
    parts: List[types.Part],
    model: Optional[str] = None,
    system_instruction: Optional[str] = None,
    json_mode: bool = False,
    temperature: float = 0.2,
    top_p: float = 0.95,
    max_output_tokens: int = 1024,
    seed: Optional[int] = None,
):
    client = get_client()
    cfg = _make_config(system_instruction, json_mode, temperature, top_p, max_output_tokens, seed=seed)
    mdl = model or _GEMINI_MODEL_DEFAULT
    return client.models.generate_content(model=mdl, contents=parts, config=cfg)

def generate_with_retry(
    parts: List[types.Part],
    model: Optional[str] = None,
    system_instruction: Optional[str] = None,
    json_mode: bool = False,
    temperature: float = 0.2,
    top_p: float = 0.95,
    max_output_tokens: int = 1024,
    seed: Optional[int] = None,
    max_attempts: int = 6,
    min_wait: int = 3,
    max_wait: int = 90,
):
    wait = min_wait
    for attempt in range(1, max_attempts + 1):
        try:
            return generate_once(
                parts=parts,
                model=model,
                system_instruction=system_instruction,
                json_mode=json_mode,
                temperature=temperature,
                top_p=top_p,
                max_output_tokens=max_output_tokens,
                seed=seed,
            )
        except Exception as e:
            msg = str(e).lower()
            # Backoff on transient overloads
            if "503" in msg or "overload" in msg or "temporarily unavailable" in msg:
                if attempt == max_attempts:
                    raise
                time.sleep(wait)
                wait = min(wait * 2, max_wait)
            else:
                raise
