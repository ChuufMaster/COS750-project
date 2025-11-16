# services/gemini.py
import os
import base64
import time
from typing import List, Optional

from dotenv import load_dotenv 
from google import genai
from google.genai import types

load_dotenv()

# ---------------------------------------------------------------------------
# Defaults (can be overridden via env vars if you really need to)
# ---------------------------------------------------------------------------
# Rate limiting: at most 1 Gemini request every N seconds (coarse global throttle)
_RATE_LIMIT_SECONDS = float(os.getenv("GEMINI_RATE_LIMIT_SECONDS", "15"))
_last_call_ts: float = 0.0

# Model: by default, always Gemini 2.5 Pro for this project
_GEMINI_MODEL_DEFAULT = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")

# Sampling defaults: temp = 1.0, top_p = 0.95 (your requested global defaults)
_DEFAULT_TEMPERATURE = float(os.getenv("GEMINI_TEMP", "1.0"))
_DEFAULT_TOP_P = float(os.getenv("GEMINI_TOP_P", "0.95"))

# Generic default system instruction, if none is provided by the caller.
# Routers can always override with a more specific instruction.
_DEFAULT_SYSTEM_INSTRUCTION = (
    "You are a university teaching assistant for an Object-Oriented "
    "Programming and Software Engineering module that uses C++, UML, and "
    "Gang of Four design patterns, with a special focus on the Factory "
    "Method pattern.\n\n"
    "Your primary roles are:\n"
    "1. Give short, high-quality feedback on student answers for non-multiple-"
    "choice questions (fill-in-the-blank, short text, code, UML, or images of "
    "answers).\n"
    "2. When a rubric or memorandum and a maximum mark are provided, compare "
    "the student's work against that memo and assign marks strictly according "
    "to it.\n\n"
    "General behaviour:\n"
    "- Always follow any task-specific instructions in the request, including "
    "required output formats (for example 'return ONLY JSON with fields ...'). "
    "If a JSON format is specified, respond with valid JSON only, with no extra "
    "prose.\n"
    "- Base every judgement only on the information actually given in the prompt "
    "or images. Do not invent steps, labels, or diagram features that are not "
    "clearly present. If the evidence is ambiguous or missing, state that you "
    "cannot determine the answer confidently instead of guessing.\n"
    "- When grading, never exceed the stated maximum mark and do not award marks "
    "for criteria that the rubric does not mention. If rubrics describe discrete "
    "checks, treat each check independently, then derive the final mark from "
    "those checks.\n"
    "- When giving feedback, aim for feedback that is:\n"
    "  * Constructive - gives at least one actionable suggestion for improvement.\n"
    "  * Encouraging - honest but supportive in tone.\n"
    "  * Polite - professionally worded, no sarcasm.\n"
    "  * Relevant - focused strictly on the student's work and the learning outcome.\n"
    "  * Concise - typically 1-3 sentences, avoiding unnecessary repetition.\n"
    "  * Corrective - clearly points out any misconception or missing requirement.\n"
    "- Prefer pointing students toward the underlying rule or concept (for example, "
    "the client should call `Creator::make()` instead of constructing concretes "
    "directly) rather than simply giving the final answer, unless the instructions "
    "explicitly allow full solutions.\n"
    "- If both text and images are provided (for example, a memo image and a student "
    "answer image), first extract the key rubric points from the memo, then compare "
    "the student work to those points before deciding on marks or feedback.\n"
    "- Use clear, precise technical language that matches the level of an undergraduate "
    "software engineering course.\n\n"
    "Unless the user explicitly asks for another language, respond in English."
)

# ---------------------------------------------------------------------------
# Client singleton
# ---------------------------------------------------------------------------

_client: Optional[genai.Client] = None


_client: Optional[genai.Client] = None


def get_client() -> genai.Client:
    """
    Lazily create and cache a single genai.Client.

    The SDK will read the API key from the environment (e.g. GOOGLE_API_KEY)
    just like in your standalone Gemini scripts where you call:

        load_dotenv()
        client = genai.Client()
    """
    global _client
    if _client is None:
        _client = genai.Client()
    return _client


# ---------------------------------------------------------------------------
# Part helpers
# ---------------------------------------------------------------------------


def part_text(text: str) -> types.Part:
    """
    Create a text Part in a way that works across google-genai versions.
    """
    try:
        # Newer API style
        return types.Part(text=text)
    except TypeError:
        # Older API fallback
        return types.Part.from_text(text)


def part_image_url(url: str, mime_type: str = "image/png") -> types.Part:
    try:
        return types.Part.from_uri(file_uri=url, mime_type=mime_type)
    except TypeError:
        # Newer style (if needed) – adjust if your version complains
        return types.Part(uri=url, mime_type=mime_type)


def part_image_b64(b64_str: str, mime_type: str = "image/png") -> types.Part:
    raw = base64.b64decode(b64_str)
    try:
        return types.Part.from_bytes(data=raw, mime_type=mime_type)
    except TypeError:
        return types.Part(inline_data=types.Blob(mime_type=mime_type, data=raw))

# ---------------------------------------------------------------------------
# Low-level generate helpers (parts already built)
# ---------------------------------------------------------------------------


def _make_config(
    system_instruction: Optional[str],
    json_mode: bool,
    temperature: float,
    top_p: float,
    max_output_tokens: int,
    seed: Optional[int] = None,
) -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        temperature=temperature,
        top_p=top_p,
        max_output_tokens=max_output_tokens,
        response_mime_type="application/json" if json_mode else None,
        system_instruction=part_text(system_instruction) if system_instruction else None,
        seed=seed,
        # media_resolution="MEDIA_RESOLUTION_HIGH",  # enable if you want
    )



def generate_once(
    parts: List[types.Part],
    model: Optional[str] = None,
    system_instruction: Optional[str] = None,
    json_mode: bool = False,
    temperature: float = _DEFAULT_TEMPERATURE,
    top_p: float = _DEFAULT_TOP_P,
    max_output_tokens: int = 100024,
    seed: Optional[int] = None,
):
    """
    Single-shot call to Gemini with pre-built parts.
    """
    client = get_client()
    # If caller did not supply a system prompt, fall back to project default
    if system_instruction is None:
        system_instruction = _DEFAULT_SYSTEM_INSTRUCTION

    cfg = _make_config(
        system_instruction,
        json_mode,
        temperature,
        top_p,
        max_output_tokens,
        seed=seed,
    )
    mdl = model or _GEMINI_MODEL_DEFAULT
    return client.models.generate_content(model=mdl, contents=parts, config=cfg)

def _rate_limit_sleep():
    """
    Simple global rate limiter: if the last Gemini call was less than
    _RATE_LIMIT_SECONDS ago, sleep for the remaining time.
    Not perfect under heavy concurrency, but sufficient for this prototype.
    """
    global _last_call_ts
    now = time.time()
    elapsed = now - _last_call_ts
    if elapsed < _RATE_LIMIT_SECONDS:
        time.sleep(_RATE_LIMIT_SECONDS - elapsed)
    _last_call_ts = time.time()


def generate_with_retry(
    parts: List[types.Part],
    model: Optional[str] = None,
    system_instruction: Optional[str] = None,
    json_mode: bool = False,
    temperature: float = _DEFAULT_TEMPERATURE,
    top_p: float = _DEFAULT_TOP_P,
    max_output_tokens: int = 100024,
    seed: Optional[int] = None,
    max_attempts: int = 6,
    min_wait: int = 3,
    max_wait: int = 90,
):
    """
    Same as generate_once, but with simple exponential backoff on transient 5xx,
    and a coarse global rate limit so we don't spam Gemini.
    """
    wait = min_wait
    for attempt in range(1, max_attempts + 1):
        try:
            # Enforce "1 request every N seconds" throttle
            _rate_limit_sleep()

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
                # Non-transient error – bubble up immediately
                raise


# ---------------------------------------------------------------------------
# High-level generate() – flexible "overloaded" entry point
# ---------------------------------------------------------------------------


def generate(
    parts: Optional[List[types.Part]] = None,
    *,
    # High-level convenience inputs – all optional
    text: Optional[str] = None,
    extra_texts: Optional[List[str]] = None,
    image_url: Optional[str] = None,
    image_b64: Optional[str] = None,
    # Common config
    model: Optional[str] = None,
    system_instruction: Optional[str] = None,
    json_mode: bool = False,
    temperature: Optional[float] = None,
    top_p: Optional[float] = None,
    max_output_tokens: int = 100024,
    seed: Optional[int] = None,
    max_attempts: int = 6,
):
    """
    Flexible wrapper that lets you:

    - Use it like before with explicit parts:
        generate(parts=my_parts, system_instruction="...", json_mode=True)

    - Or in a higher-level way:
        generate(
            instruction="Explain the Factory Method intent",
            text="Short explanation for COS214...",
        )

        generate(
            instruction="Give feedback on this UML diagram",
            image_url="https://...",
        )

    It will:
      * Apply your requested global defaults: temp=1.0, top_p=0.95
      * Use the default system instruction if none is provided
      * Build parts from text / image args when parts is None
    """

    # Resolve defaults for sampling params
    if temperature is None:
        temperature = _DEFAULT_TEMPERATURE
    if top_p is None:
        top_p = _DEFAULT_TOP_P

    # If the caller didn't give explicit parts, build them from text/image args
    if parts is None:
        built_parts: List[types.Part] = []

        if text:
            built_parts.append(part_text(text))

        if extra_texts:
            for t in extra_texts:
                if t:
                    built_parts.append(part_text(t))

        if image_url:
            built_parts.append(part_image_url(image_url))

        if image_b64:
            built_parts.append(part_image_b64(image_b64))

        parts = built_parts

    if not parts:
        raise ValueError(
            "gemini.generate(): you must provide either 'parts' or at least one of "
            "'text', 'extra_texts', 'image_url', or 'image_b64'."
        )

    # Delegate to the retrying helper
    return generate_with_retry(
        parts=parts,
        model=model,
        system_instruction=system_instruction,
        json_mode=json_mode,
        temperature=temperature,
        top_p=top_p,
        max_output_tokens=max_output_tokens,
        seed=seed,
        max_attempts=max_attempts,
    )