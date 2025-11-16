# backend/routers/ai.py
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json

# Robust import: supports running either `uvicorn backend.main:app` (root)
# or `uvicorn main:app` (cwd = src/backend).
try:
    from backend.services import gemini as gx
except ImportError:
    from services import gemini as gx

# >>> Create the router BEFORE using decorators
router = APIRouter()

# ---------- request models ----------

class GenerateRequest(BaseModel):
    instruction: str
    parts: List[Dict[str, Any]]  # each: {"text": ...} | {"image_url": ..., "mime_type": "..."} | {"image_b64": ...}
    json_mode: bool = False
    model: Optional[str] = None
    temperature: float = 0.2
    top_p: float = 0.95
    max_output_tokens: int = 1024

class GradeRequest(BaseModel):
    rubric: str
    student_text: Optional[str] = None
    student_image_url: Optional[str] = None
    student_image_b64: Optional[str] = None
    max_points: int = 1
    model: Optional[str] = None
    request_json: bool = True

# ---------- helpers ----------

def _parts_from_wire(parts_wire: List[Dict[str, Any]]):
    parts = []
    for p in parts_wire:
        if "text" in p:
            parts.append(gx.part_text(p["text"]))
        elif "image_url" in p:
            parts.append(gx.part_image_url(p["image_url"], p.get("mime_type", "image/png")))
        elif "image_b64" in p:
            parts.append(gx.part_image_b64(p["image_b64"], p.get("mime_type", "image/png")))
        else:
            raise HTTPException(400, f"Unsupported content part: {p}")
    return parts

def _resp_text(resp) -> str:
    # SDK surfaces text slightly differently across versions
    for attr in ("text", "output_text"):
        if hasattr(resp, attr):
            return getattr(resp, attr)
    return str(resp)

# ---------- routes ----------

@router.get("/health")
def health():
    return {"ok": True}

@router.post("/generate")
def generate(req: GenerateRequest):
    parts = _parts_from_wire(req.parts)
    resp = gx.generate(
        parts=parts,
        model=req.model,
        system_instruction=req.instruction,
        json_mode=req.json_mode,
        temperature=req.temperature,
        top_p=req.top_p,
        max_output_tokens=req.max_output_tokens,
    )
    return {"ok": True, "text": _resp_text(resp)}

@router.post("/grade")
def grade(req: GradeRequest):
    system = (
        "You are a strict grader. Read the rubric and the student's submission. "
        "Return ONLY a compact JSON object with fields: "
        '{"score": number (0..max_points), "reasons": string, "advice": string}.'
    )

    parts = [gx.part_text(f"RUBRIC (max_points={req.max_points}):\n{req.rubric}")]
    if req.student_text:
        parts.append(gx.part_text(f"STUDENT:\n{req.student_text}"))
    if req.student_image_url:
        parts.append(gx.part_image_url(req.student_image_url))
    if req.student_image_b64:
        parts.append(gx.part_image_b64(req.student_image_b64))

    resp = gx.generate(parts=parts, model=req.model, system_instruction=system, json_mode=req.request_json)
    text = _resp_text(resp)

    if req.request_json:
        try:
            data = json.loads(text)
            return {
                "ok": True,
                "score": data.get("score", 0),
                "reasons": data.get("reasons", ""),
                "advice": data.get("advice", ""),
                "raw": data,
            }
        except Exception:
            # Model didn’t return valid JSON — hand back raw text for debugging
            return {"ok": True, "raw_text": text}

    return {"ok": True, "text": text}