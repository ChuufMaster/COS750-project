# scripts/test_gemini.py

import json

from services import gemini as gx


def _extract_text(resp) -> str:
    """
    Try to pull the raw text out of a google-genai response in a robust way.
    """
    # Newer SDKs give .text for text-only responses
    txt = getattr(resp, "text", None)
    if txt:
        return txt

    # Fallback: dig into candidates/parts
    try:
        cand = resp.candidates[0]
        # Newer style: cand.content.parts[0].text
        part = cand.content.parts[0]
        if hasattr(part, "text") and part.text:
            return part.text
    except Exception:
        pass

    # Last resort: repr
    return repr(resp)


def basic_test():
    print("=== [1] Basic Gemini JSON test ===")
    resp = gx.generate(
        text=(
            "Return ONLY a compact JSON object with fields "
            '{"ok": true or false, "msg": string}. '
            "No prose, no markdown."
        ),
        json_mode=True,
        temperature=0.1,
        max_output_tokens=60004,
    )
    raw = _extract_text(resp)
    print("Raw text from Gemini:")
    print(repr(raw))

    try:
        data = json.loads(raw)
        print("Parsed JSON:")
        print(data)
    except Exception as e:
        print("JSON decode FAILED:", e)


def quiz_style_test():
    print("\n=== [2] Quiz-style grading test ===")

    rubric = (
        "You are grading a short student answer about the Factory Method pattern.\n"
        "Award an integer mark between 0 and 2.\n"
        "Marking guide:\n"
        "- +1 if they correctly say Factory Method is a *creational* pattern.\n"
        "- +1 if they mention that the client calls Creator::make() and receives "
        "a Product* (or Product base) instead of constructing concretes directly.\n"
        "\n"
        "Return ONLY JSON with fields:\n"
        '{ "marks": int, "feedback": string }.\n'
        "No prose outside the JSON. The JSON must be valid and parseable."
    )

    student_answer = (
        "Factory Method is a creational pattern. The client calls Creator::make() "
        "and gets a Product* so it never directly constructs concrete types."
    )

    prompt = (
        "RUBRIC:\n"
        f"{rubric}\n\n"
        "STUDENT ANSWER:\n"
        f"{student_answer}\n\n"
        "Now grade strictly according to the rubric and output only the JSON."
    )

    resp = gx.generate(
        text=prompt,
        json_mode=True,
        temperature=0.1,
        max_output_tokens=12800,
    )
    raw = _extract_text(resp)
    print("Raw text from Gemini (quiz-style):")
    print(repr(raw))

    try:
        data = json.loads(raw)
        print("Parsed JSON:")
        print(data)
    except Exception as e:
        print("JSON decode FAILED:", e)


if __name__ == "__main__":
    print(f"Using GEMINI model: {gx._GEMINI_MODEL_DEFAULT}")
    basic_test()
    quiz_style_test()
