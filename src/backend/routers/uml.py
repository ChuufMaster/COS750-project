from __future__ import annotations
import json
from pathlib import Path
from typing import Dict, Iterable, List, Optional
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

CONTENT_ROOT = Path(__file__).resolve().parent / ".." / "content" / "UML"
TASK_TYPES = ("code-to-diagram", "diagram-to-code")
TYPE_TO_FOLDER = {
    "code-to-diagram": "codetodiagram",
    "diagram-to-code": "diagramtocode",
}

# ----------------------------- helpers --------------------------------------
def _iter_task_dirs() -> Iterable[Path]:
    """Yield all task directories under both task-type folders."""
    for sub in TYPE_TO_FOLDER.values():
        root = CONTENT_ROOT / sub
        if not root.exists():
            continue
        for p in sorted(root.iterdir()):
            if p.is_dir() and (p / "task.json").exists():
                yield p


def _load_task_json(task_dir: Path) -> Dict:
    task_file = task_dir / "task.json"
    try:
        with task_file.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Missing task.json in {task_dir.name}")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON in {task_file}: {e}")
    return data


def _find_task_dir_by_id(task_id: str) -> Path:
    """Locate the directory for a given task id by searching both type roots."""
    for d in _iter_task_dirs():
        if d.name == task_id:
            return d
    raise HTTPException(status_code=404, detail=f"Task {task_id} not found")


# ================================
# TASKS & PROMPTS
# ================================

@router.get("/tasks")
def list_tasks(type: Optional[str] = Query(default=None, description="Filter by task type")):
    """List all tasks (optionally filter by type=code-to-diagram or diagram-to-code)."""
    if type is not None:
        if type not in TASK_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid type. Expected one of {list(TASK_TYPES)}",
            )

    items: List[Dict] = []
    for task_dir in _iter_task_dirs():
        meta = _load_task_json(task_dir)
        ttype = meta.get("type")
        if ttype not in TASK_TYPES:
            continue
        if type is not None and ttype != type:
            continue

        items.append(
            {
                "id": meta.get("id", task_dir.name),
                "title": meta.get("title", task_dir.name),
                "type": ttype,
                "language": meta.get("language"),
                "version": meta.get("version"),
                "maxScore": meta.get("maxScore"),
                "tags": meta.get("tags", []),
            }
        )
    return {"tasks": items}


@router.get("/tasks/{task_id}")
def get_task(task_id: str):
    """Get metadata for a specific task."""
    task_dir = _find_task_dir_by_id(task_id)
    meta = _load_task_json(task_dir)

    # Return metadata only (no prompt payloads here)
    allowed_keys = {
        "id",
        "type",
        "title",
        "description",
        "language",
        "version",
        "maxScore",
        "tags",
        "apollonVersion",
        "rubricId",
        "testSuiteId",
    }
    return {k: v for k, v in meta.items() if k in allowed_keys}


@router.get("/tasks/{task_id}/prompt")
def get_task_prompt(task_id: str):
    """Return the prompt assets for the task (code snippet or UML model)."""
    task_dir = _find_task_dir_by_id(task_id)
    meta = _load_task_json(task_dir)

    ttype = meta.get("type")
    if ttype not in TASK_TYPES:
        raise HTTPException(status_code=500, detail=f"Task {task_id} has unknown type: {ttype}")

    if ttype == "code-to-diagram":
        # Serve code snippet + metadata required by the frontend
        code_path = task_dir / "prompt.code.cpp"
        if not code_path.exists():
            raise HTTPException(status_code=404, detail=f"prompt.code.cpp not found for {task_id}")
        try:
            code = code_path.read_text(encoding="utf-8")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read code prompt: {e}")

        return {
            "id": meta.get("id", task_id),
            "type": ttype,
            "language": meta.get("language", "cpp"),
            "apollonVersion": meta.get("apollonVersion"),
            "prompt": {
                "kind": "code",
                "filename": "prompt.code.cpp",
                "code": code,
            },
        }

    # diagram-to-code
    uml_path = task_dir / "prompt.uml.json"
    if not uml_path.exists():
        raise HTTPException(status_code=404, detail=f"prompt.uml.json not found for {task_id}")
    try:
        with uml_path.open("r", encoding="utf-8") as f:
            uml_model = json.load(f)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON in prompt.uml.json: {e}")

    return {
        "id": meta.get("id", task_id),
        "type": ttype,
        "language": meta.get("language", "cpp"),
        "apollonVersion": meta.get("apollonVersion") or uml_model.get("apollonVersion"),
        "prompt": {
            "kind": "uml",
            "model": uml_model,
        },
        # optional hint for grader wiring in UI later
        "testSuiteId": meta.get("testSuiteId"),
    }


# ================================
# SUBMISSIONS
# ================================

@router.post("/tasks/{task_id}/submissions")
def create_submission(task_id: str):
    """Create a draft submission for a task."""
    pass


@router.patch("/submissions/{submission_id}")
def update_submission(submission_id: str):
    """Autosave partial work (diagram JSON or code text)."""
    pass


@router.post("/submissions/{submission_id}/finalize")
def finalize_submission(submission_id: str):
    """Lock the submission and trigger grading."""
    pass


@router.get("/submissions/{submission_id}")
def get_submission(submission_id: str):
    """Retrieve submission details, score, and feedback."""
    pass


# ================================
# CONVENIENCE ALIASES (for clarity in frontend)
# ================================

@router.post("/tasks/{task_id}/submitcodetodiagram")
def submit_code_to_diagram(task_id: str):
    """Submit a diagram for grading (student built diagram from code)."""
    pass


@router.post("/tasks/{task_id}/submitdiagramtocode")
def submit_diagram_to_code(task_id: str):
    """Submit code for grading (student wrote code from diagram)."""
    pass


# ================================
# INTERNAL GRADERS (backend-only)
# ================================

@router.post("/_grade/diagram")
def grade_diagram():
    """Internal route: grade a UML diagram model."""
    pass


@router.post("/_grade/code")
def grade_code():
    """Internal route: compile and test submitted code."""
    pass


# ================================
# ARTIFACTS
# ================================

@router.get("/submissions/{submission_id}/artifacts")
def get_submission_artifacts(submission_id: str):
    """Return signed URLs or file handles for submission artifacts."""
    pass