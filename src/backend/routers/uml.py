from __future__ import annotations
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
import re

router = APIRouter()
BASE = Path(__file__).resolve().parent.parent.parent.parent / "examples" / "UML"
CLASS_REGEX = re.compile(
    r"class\s+(\w+)\s*(?::\s*public\s+(\w+))?\s*\{"
)
METHOD_REGEX = re.compile(
    r"\b(\w+)\s*\([^)]*\)\s*(?:override)?\s*\{"
)

# helpers
def read_json(path: Path):
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {path.name}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON in {path.name}: {e}")
    
def normalize_apollon_model(model: dict):
    """
    Convert a raw Apollon export into a minimal, semantic UML representation.
    Extracts:
    - classes + abstract/concrete kind
    - methods
    - relationships (inheritance, realization, dependency)
    """

    elements = model.get("elements", {})
    relationships = model.get("relationships", {})

    # ---------------------------------------
    # CLASS EXTRACTION
    # ---------------------------------------
    classes = []
    id_to_name = {}

    for element_id, el in elements.items():
        type_ = el.get("type")
        if type_ not in ["Class", "AbstractClass"]:
            continue

        name = el.get("name", "").strip()
        if not name:
            continue  # ignore unnamed classes

        id_to_name[element_id] = name

        # Extract method names
        method_names = []
        for method_id in el.get("methods", []):
            m = elements.get(method_id)
            if not m:
                continue
            m_name = m.get("name", "").strip()
            if m_name:
                method_names.append(m_name)

        classes.append({
            "name": name,
            "kind": "abstract" if type_ == "AbstractClass" else "class",
            "methods": sorted(method_names)
        })

    # ---------------------------------------
    # RELATIONSHIPS EXTRACTION
    # ---------------------------------------
    rels = []

    for rel_id, rel in relationships.items():
        src_id = rel.get("source", {}).get("element")
        tgt_id = rel.get("target", {}).get("element")

        if not src_id or not tgt_id:
            continue

        src_name = id_to_name.get(src_id)
        tgt_name = id_to_name.get(tgt_id)
        if not src_name or not tgt_name:
            continue

        apollon_type = rel.get("type")

        # Map to canonical type
        if apollon_type in ["ClassInheritance", "Inheritance"]:
            rel_type = "Inheritance"
        elif apollon_type in ["ClassRealization", "Realization"]:
            rel_type = "Realization"
        else:
            rel_type = "Dependency"

        rels.append({
            "type": rel_type,
            "from": src_name,
            "to": tgt_name
        })

    # ---------------------------------------
    # STABLE SORTING FOR COMPARISON
    # ---------------------------------------
    classes = sorted(classes, key=lambda c: c["name"])
    rels = sorted(rels, key=lambda r: (r["type"], r["from"], r["to"]))

    return {
        "classes": classes,
        "relationships": rels
    }

def compare_models(student: dict, rubric: dict):
    """
    Compare a normalized student UML model to the rubric UML model.
    Returns:
        (score, max_score, feedback_dict)
    """

    # ---------------------------------------
    # PREP
    # ---------------------------------------
    student_classes = {c["name"]: c for c in student["classes"]}
    rubric_classes = {c["name"]: c for c in rubric["classes"]}

    student_rels = {(r["type"], r["from"], r["to"]) for r in student["relationships"]}
    rubric_rels = {(r["type"], r["from"], r["to"]) for r in rubric["relationships"]}

    # ---------------------------------------
    # CLASS SCORING
    # ---------------------------------------
    missing_classes = set(rubric_classes.keys()) - set(student_classes.keys())
    extra_classes = set(student_classes.keys()) - set(rubric_classes.keys())

    class_score = len(rubric_classes) - len(missing_classes)
    class_score = max(class_score, 0)

    # ---------------------------------------
    # RELATIONSHIP SCORING
    # ---------------------------------------
    missing_rels = rubric_rels - student_rels
    extra_rels = student_rels - rubric_rels

    rel_score = len(rubric_rels) - len(missing_rels)
    rel_score = max(rel_score, 0)

    # ---------------------------------------
    # METHOD SCORING
    # ---------------------------------------
    method_feedback = {}
    method_score = 0
    total_expected_methods = 0

    for cls_name, rub_cls in rubric_classes.items():
        expected_methods = set(rub_cls.get("methods", []))
        student_methods = set(student_classes.get(cls_name, {}).get("methods", []))

        missing_methods = expected_methods - student_methods
        extra_methods = student_methods - expected_methods

        # Count for totals
        total_expected_methods += len(expected_methods)
        method_score += len(expected_methods) - len(missing_methods)

        if missing_methods or extra_methods:
            method_feedback[cls_name] = {
                "missingMethods": sorted(list(missing_methods)),
                "extraMethods": sorted(list(extra_methods))
            }

    method_score = max(method_score, 0)

    # ---------------------------------------
    # TOTAL SCORING
    # ---------------------------------------
    total_score = (
        class_score +
        2 * rel_score +
        method_score
    )

    max_score = (
        len(rubric_classes) +
        2 * len(rubric_rels) +
        total_expected_methods
    )

    # ---------------------------------------
    # FEEDBACK
    # ---------------------------------------
    feedback = {
        "missingClasses": sorted(list(missing_classes)),
        "extraClasses": sorted(list(extra_classes)),
        "missingRelationships": sorted(list(missing_rels)),
        "extraRelationships": sorted(list(extra_rels)),
        "methodFeedback": method_feedback,
        "scoreBreakdown": {
            "classScore": class_score,
            "relationshipScore": rel_score,
            "methodScore": method_score,
            "totalExpectedMethods": total_expected_methods,
            "maxScore": max_score
        }
    }

    return total_score, max_score, feedback

def normalize_cpp(code: str):
    """
    Extracts class names, inheritance, and method names.
    Very forgiving — matches most student submissions.
    """

    classes = []
    relationships = []

    # Find classes + optional base classes
    for class_match in CLASS_REGEX.finditer(code):
        cls, base = class_match.groups()

        classes.append(cls)

        if base:
            relationships.append({
                "type": "Inheritance",
                "from": cls,
                "to": base
            })

    # Extract methods per class
    class_method_map = {c: [] for c in classes}

    for cls in classes:
        # Extract class body
        pattern = rf"class\s+{cls}.*?\{{(.*?)\}};"
        m = re.search(pattern, code, flags=re.S)

        if not m:
            continue

        body = m.group(1)

        # Extract method definitions/signatures
        for method_match in METHOD_REGEX.finditer(body):
            name = method_match.group(1)
            if name != cls:  # skip constructor
                class_method_map[cls].append(name)

    return {
        "classes": class_method_map,
        "relationships": relationships
    }

def compare_cpp_to_rubric(student, rubric):
    student_classes = student["classes"]
    rubric_classes = {c["name"]: c for c in rubric["classes"]}

    student_rels = {(r["from"], r["to"]) for r in student["relationships"]}
    rubric_rels = {(r["from"], r["to"]) for r in rubric["relationships"]}

    # Class checks
    missing_classes = set(rubric_classes) - set(student_classes)
    extra_classes = set(student_classes) - set(rubric_classes)

    class_score = len(rubric_classes) - len(missing_classes)

    # Method checks
    method_score = 0
    total_methods = 0
    method_feedback = {}

    for cname, rubcls in rubric_classes.items():
        expected = set(rubcls.get("methods", []))
        total_methods += len(expected)

        got = set(student_classes.get(cname, []))

        missing = expected - got
        extra = got - expected

        method_score += len(expected) - len(missing)

        if missing or extra:
            method_feedback[cname] = {
                "missingMethods": list(missing),
                "extraMethods": list(extra)
            }

    # Relationship checks
    missing_rels = rubric_rels - student_rels
    rel_score = len(rubric_rels) - len(missing_rels)

    total_score = class_score + rel_score + method_score
    max_score = len(rubric_classes) + len(rubric_rels) + total_methods

    feedback = {
        "missingClasses": list(missing_classes),
        "extraClasses": list(extra_classes),
        "missingRelationships": list(missing_rels),
        "methodFeedback": method_feedback,
        "scores": {
            "classScore": class_score,
            "relScore": rel_score,
            "methodScore": method_score
        }
    }

    return total_score, max_score, feedback

# -------------------------------------------------
# GET: Code To Diagram (CTD)
# -------------------------------------------------
@router.get("/CTD")
def get_code_to_diagram_task():
    task_dir = BASE / "CTD"

    task = read_json(task_dir / "task.json")
    code = (task_dir / "prompt.code.cpp").read_text(encoding="utf-8")
    rubric = read_json(task_dir / "rubric.uml.json")

    return {
        "id": task["id"],
        "type": "code-to-diagram",
        "title": task["title"],
        "description": task.get("description", ""),
        "language": "cpp",
        "prompt": {
            "kind": "code",
            "code": code
        },
        "rubric": rubric  # included for now (frontend may not display it)
    }

# -------------------------------------------------
# POST: Submit CTD (student UML JSON)
# -------------------------------------------------
@router.post("/SubmitCTD")
def submit_code_to_diagram_task(submission: dict):
    student_raw = submission.get("uml")
    if not student_raw:
        raise HTTPException(status_code=400, detail="Missing UML model")

    # Load rubric
    rubric_path = BASE / "CTD" / "rubric.uml.json"
    rubric = read_json(rubric_path)

    # Normalize both
    student = normalize_apollon_model(student_raw)
    rub = {
        "classes": rubric["classes"],
        "relationships": rubric["relationships"]
    }

    score, max_score, feedback = compare_models(student, rub)

    return {
        "score": score,
        "maxScore": max_score,
        "feedback": feedback,
        "normalizedStudent": student
    }

# -------------------------------------------------
# GET: Diagram To Code (DTC)
# -------------------------------------------------
@router.get("/DTC")
def get_diagram_to_code_task():
    task_dir = BASE / "DTC"

    task = read_json(task_dir / "task.json")
    rubric = read_json(task_dir / "rubric.uml.json")

    # DTC uses an image diagram instead of Apollon JSON
    img_path = task_dir / "prompt.png"
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="prompt.png not found")

    # You can serve static files directly, but simplest:
    img_url = f"/static/UML/DTC/prompt.png"

    return {
        "id": task["id"],
        "type": "diagram-to-code",
        "title": task["title"],
        "description": task.get("description", ""),
        "language": "cpp",
        "prompt": {
            "kind": "image",
            "url": img_url
        },
        "rubric": rubric,
        "testSuite": "test.cpp"
    }

# -------------------------------------------------
# POST: Submit DTC (student C++ code)
# -------------------------------------------------
@router.post("/SubmitDTC")
def submit_diagram_to_code_task(payload: dict):
    code = payload.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing 'code' field")

    rubric_path = BASE / "DTC" / "rubric.uml.json"
    rubric = json.loads(rubric_path.read_text())

    student = normalize_cpp(code)

    score, max_score, feedback = compare_cpp_to_rubric(student, rubric)

    return {
        "score": score,
        "maxScore": max_score,
        "feedback": feedback,
        "normalizedStudent": student
    }
