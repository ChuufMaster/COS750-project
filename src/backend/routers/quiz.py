from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal, Any
import time, random, csv, io, os

# OPTIONAL: Set QUIZ_USE_GEMINI_FEEDBACK=1 to enable LLM feedback
USE_LLM_FEEDBACK = os.getenv("QUIZ_USE_GEMINI_FEEDBACK", "1") == "1"

# If you kept the service-only client (no HTTP router), import it directly:
try:
    from services import gemini_client as gx  # your service file
except Exception:
    gx = None  # degrade gracefully if service not present

router = APIRouter()

# -------------------------------
# Data models (wire & internal)
# -------------------------------

ItemType = Literal["mcq_single", "mcq_multi", "fitb"]  # MVP-simple types

class ItemOption(BaseModel):
    key: str
    text: str

class Item(BaseModel):
    id: str
    type: ItemType
    prompt: str
    options: Optional[List[ItemOption]] = None        # mcq_* only
    answer: Any                                       # str | List[str]
    marks: int = 1
    lo_ids: List[int] = Field(default_factory=list)   # Learning Outcomes (from ID doc)
    error_class_on_miss: Optional[str] = None         # coarse error tag

class MicroQuiz(BaseModel):
    id: str
    title: str
    desc: str
    items: List[Item]
    total_marks: int
    target_los: List[int]

class MQMeta(BaseModel):
    id: str
    title: str
    desc: str
    total_marks: int
    target_los: List[int]

class ItemAttempt(BaseModel):
    item_id: str
    response: Any
    time_ms: Optional[int] = None

class SubmitPayload(BaseModel):
    session_id: str
    mq_id: str
    attempts: List[ItemAttempt]
    attempt_number: Optional[int] = 1  # front-end may track, but we also infer

class ItemResult(BaseModel):
    item_id: str
    correct: bool
    marks_awarded: int
    expected: Any
    feedback: Optional[str] = None
    lo_ids: List[int] = Field(default_factory=list)
    error_class: Optional[str] = None

class SubmitResult(BaseModel):
    session_id: str
    mq_id: str
    attempt_number: int
    results: List[ItemResult]
    total_awarded: int
    total_possible: int

# -------------------------------
# In-memory stores (MVP)
# -------------------------------

ITEM_BANK: Dict[str, MicroQuiz] = {}
ANALYTICS: List[Dict[str, Any]] = []
FIRST_GRADED_REC: Dict[tuple, bool] = {}  # (session_id, mq_id) -> seen_first_graded

# -------------------------------
# Helpers
# -------------------------------

def _norm(s: str) -> str:
    return (s or "").strip().lower()

def _score_item(item: Item, resp: Any) -> ItemResult:
    """Deterministic scoring; feedback added later (LLM for non-MC only)."""
    correct = False
    exp = item.answer
    awarded = 0

    if item.type == "mcq_single":
        correct = str(resp) == str(exp)
    elif item.type == "mcq_multi":
        correct = set(map(str, (resp or []))) == set(map(str, exp))
    elif item.type == "fitb":
        correct = _norm(str(resp)) == _norm(str(exp))
    else:
        raise HTTPException(400, f"Unsupported item type: {item.type}")

    if correct:
        awarded = item.marks

    # default hard-coded hint for MC; LLM feedback handled after this call
    fb = None
    if not correct and item.error_class_on_miss:
        fb = f"Hint: {item.error_class_on_miss.replace('-', ' ')}."

    return ItemResult(
        item_id=item.id,
        correct=correct,
        marks_awarded=awarded,
        expected=item.answer,
        feedback=fb,
        lo_ids=item.lo_ids,
        error_class=None if correct else item.error_class_on_miss,
    )

def _gen_feedback_fitb(prompt: str, student_text: str, expected: str, error_class: Optional[str]) -> Optional[str]:
    """
    Call Gemini to generate brief formative feedback for non-MC (fitb) items.
    Kept OUT of grading. Returns short plain text or None on any failure.
    """
    if not USE_LLM_FEEDBACK or gx is None:
        return None
    try:
        parts = [
            gx.part_text(
                "You are a concise Factory Method tutor. "
                "Given the question, student's short answer, and the expected answer, "
                "give ONE actionable hint in <= 50 words. "
                "Do NOT reveal the exact expected word if possible; nudge the rule."
            ),
            gx.part_text(f"Question: {prompt}"),
            gx.part_text(f"Student answer: {student_text}"),
            gx.part_text(f"Expected (target concept/term): {expected}"),
        ]
        if error_class:
            parts.append(gx.part_text(f"Error tag: {error_class}"))
        resp = gx.generate_with_retry(parts=parts, json_mode=False, seed=42424242)
        return (resp.text or "").strip()[:500]  # keep it short
    except Exception:
        return None

def _calc_total(items: List[Item]) -> int:
    return sum(i.marks for i in items)

def _ensure_item_bank_seeded():
    if ITEM_BANK:
        return

    # ---------------- MQ1 ----------------
    mq1_items = [
        Item(
            id="mq1_q1",
            type="mcq_single",
            prompt="Factory Method is a ___ pattern used to ___.",
            options=[
                ItemOption(key="A", text="creational; delegate object creation to subclasses"),
                ItemOption(key="B", text="structural; share state across instances"),
                ItemOption(key="C", text="behavioral; broadcast events to observers"),
            ],
            answer="A",
            marks=2,
            lo_ids=[1,2,3,4,6],
            error_class_on_miss="intent-or-classification-misunderstood",
        ),
        Item(
            id="mq1_q2",
            type="fitb",
            prompt="In FM, the client must not construct ______ types directly.",
            answer="concrete",
            marks=1,
            lo_ids=[4,9],
            error_class_on_miss="client-still-constructs",
        ),
        Item(
            id="mq1_q3",
            type="mcq_single",
            prompt="Which cue best suggests FM over Simple Factory?",
            options=[
                ItemOption(key="A", text="Need to choose families together"),
                ItemOption(key="B", text="Creation varies in subclasses via an override"),
                ItemOption(key="C", text="No polymorphism is needed"),
            ],
            answer="B",
            marks=2,
            lo_ids=[6,9],
            error_class_on_miss="pattern-triage-confusion",
        ),
    ]
    ITEM_BANK["mq1"] = MicroQuiz(
        id="mq1",
        title="MQ1: Intent and recognition",
        desc="Why patterns, FM intent, and the rule that clients do not construct concretes.",
        items=mq1_items,
        total_marks=_calc_total(mq1_items),
        target_los=[1,2,3,4,6,9],
    )

    # ---------------- MQ2 ----------------
    mq2_items = [
        Item(
            id="mq2_q1",
            type="mcq_single",
            prompt="Which role declares the factory operation that returns Product?",
            options=[
                ItemOption(key="A", text="Creator"),
                ItemOption(key="B", text="ConcreteProduct"),
                ItemOption(key="C", text="Client"),
            ],
            answer="A",
            marks=2,
            lo_ids=[5,7,13],
            error_class_on_miss="uml-roles-mislabelled",
        ),
        Item(
            id="mq2_q2",
            type="fitb",
            prompt="In the UML, the factory returns the base type ______.",
            answer="Product",
            marks=2,
            lo_ids=[5,13],
            error_class_on_miss="wrong-factory-return-type",
        ),
    ]
    ITEM_BANK["mq2"] = MicroQuiz(
        id="mq2",
        title="MQ2: UML roles and notation",
        desc="Label Creator/Product roles, abstract markers, and factory return types.",
        items=mq2_items,
        total_marks=_calc_total(mq2_items),
        target_los=[5,7,13],
    )

    # ---------------- MQ3 ---------------- (includes image placeholders)
    mq3_items = [
        Item(
            id="mq3_q1",
            type="mcq_single",
            prompt="Which UML relationship represents ConcreteCreator inheriting from Creator?",
            options=[
                ItemOption(key="A", text="Association"),
                ItemOption(key="B", text="Generalisation (open triangle arrow)"),
                ItemOption(key="C", text="Aggregation"),
            ],
            answer="B",
            marks=2,
            lo_ids=[10,12,23],
            error_class_on_miss="uml-relationship-misused",
        ),
        Item(
            id="mq3_q2",
            type="fitb",
            prompt="The factory operation on Creator should return the base type ______.",
            answer="Product",
            marks=1,
            lo_ids=[10,23],
            error_class_on_miss="wrong-factory-return-type",
        ),
        Item(
            id="mq3_q3",
            type="mcq_single",
            prompt="[IMAGE REQUIRED: uml_mq3_q3.png] Which diagram correctly shows the factory op on Creator returning Product?",
            options=[
                ItemOption(key="A", text="Diagram A"),
                ItemOption(key="B", text="Diagram B"),
                ItemOption(key="C", text="Diagram C"),
            ],
            answer="A",
            marks=2,
            lo_ids=[10,12,23],
            error_class_on_miss="factory-signature-wrong",
        ),
    ]
    ITEM_BANK["mq3"] = MicroQuiz(
        id="mq3",
        title="MQ3: Code ⇔ UML mapping",
        desc="Map code cues to UML and back.",
        items=mq3_items,
        total_marks=_calc_total(mq3_items),
        target_los=[10,12,23],
    )

    # ---------------- MQ4 ----------------
    mq4_items = [
        Item(
            id="mq4_q1",
            type="mcq_multi",
            prompt="Select all cues that a class is a Creator in FM.",
            options=[
                ItemOption(key="A", text="Declares virtual factory returning Product"),
                ItemOption(key="B", text="Overrides factory and returns ConcreteProduct"),
                ItemOption(key="C", text="Has a public field of ConcreteProduct type"),
            ],
            answer=["A", "B"],
            marks=2,
            lo_ids=[14,17,18],
            error_class_on_miss="role-cues-misidentified",
        ),
        Item(
            id="mq4_q2",
            type="fitb",
            prompt="To delete via a Product* safely, Product needs a ______ destructor.",
            answer="virtual",
            marks=2,
            lo_ids=[19,20],
            error_class_on_miss="missing-virtual-destructor",
        ),
        Item(
            id="mq4_q3",
            type="mcq_single",
            prompt="[IMAGE REQUIRED: code_mq4_q3.png] Which snippet will cause undefined behavior when deleting via Product*?",
            options=[
                ItemOption(key="A", text="Snippet A: Product has virtual ~Product()."),
                ItemOption(key="B", text="Snippet B: Product lacks a virtual destructor."),
                ItemOption(key="C", text="Snippet C: Product destructor is defaulted and virtual."),
            ],
            answer="B",
            marks=1,
            lo_ids=[19,20],
            error_class_on_miss="lifecycle-contract-missed",
        ),
    ]
    ITEM_BANK["mq4"] = MicroQuiz(
        id="mq4",
        title="MQ4: Code role cues and lifecycle",
        desc="Recognise roles and required lifecycle contracts.",
        items=mq4_items,
        total_marks=_calc_total(mq4_items),
        target_los=[14,17,18,19,20],
    )

    # ---------------- MQ5 ----------------
    mq5_items = [
        Item(
            id="mq5_q1",
            type="mcq_single",
            prompt="Which change removes client coupling to Concrete?",
            options=[
                ItemOption(key="A", text="Client includes ConcreteA.h directly"),
                ItemOption(key="B", text="Client calls Creator::make() and uses Product*"),
                ItemOption(key="C", text="Client switches on a type enum to new a concrete"),
            ],
            answer="B",
            marks=3,
            lo_ids=[21],
            error_class_on_miss="client-still-constructs",
        ),
        Item(
            id="mq5_q2",
            type="fitb",
            prompt="After refactoring, the client should invoke ________ instead of constructing concretes.",
            answer="Creator::make()",
            marks=2,
            lo_ids=[21],
            error_class_on_miss="wrong-call-site",
        ),
    ]
    ITEM_BANK["mq5"] = MicroQuiz(
        id="mq5",
        title="MQ5: Refactor to Factory Method",
        desc="Move creation into the factory and keep client abstract.",
        items=mq5_items,
        total_marks=_calc_total(mq5_items),
        target_los=[21],
    )

    # ---------------- MQ6 ----------------
    mq6_items = [
        Item(
            id="mq6_q1",
            type="mcq_single",
            prompt="You add a new ConcreteProduct and ConcreteCreator while the client stays unchanged. Which pattern does this cue?",
            options=[
                ItemOption(key="A", text="Factory Method"),
                ItemOption(key="B", text="Simple Factory"),
                ItemOption(key="C", text="Abstract Factory"),
            ],
            answer="A",
            marks=2,
            lo_ids=[12,22],
            error_class_on_miss="pattern-triage-confusion",
        ),
        Item(
            id="mq6_q2",
            type="mcq_single",
            prompt="Families chosen together with fixed combinations is a decisive cue for _____.",
            options=[
                ItemOption(key="A", text="Factory Method"),
                ItemOption(key="B", text="Abstract Factory"),
                ItemOption(key="C", text="Simple Factory"),
            ],
            answer="B",
            marks=2,
            lo_ids=[12,15],
            error_class_on_miss="af-vs-fm-confusion",
        ),
        Item(
            id="mq6_q3",
            type="fitb",
            prompt="In FM, adding ConcreteProductB usually implies adding a matching ________.",
            answer="ConcreteCreatorB",
            marks=1,
            lo_ids=[22],
            error_class_on_miss="extension-mechanics-missed",
        ),
    ]
    ITEM_BANK["mq6"] = MicroQuiz(
        id="mq6",
        title="MQ6: Extension and pattern discrimination",
        desc="Add variants cleanly and tell FM vs AF vs Simple apart.",
        items=mq6_items,
        total_marks=_calc_total(mq6_items),
        target_los=[12,15,22],
    )

_ensure_item_bank_seeded()

# -------------------------------
# Routes
# -------------------------------

@router.get("/mqs", response_model=List[MQMeta])
def list_mqs():
    """Catalog of available MQs (for Start-MQ flow while lessons are non-MVP)."""
    metas = [
        MQMeta(
            id=mq.id,
            title=mq.title,
            desc=mq.desc,
            total_marks=mq.total_marks,
            target_los=mq.target_los,
        )
        for mq in ITEM_BANK.values()
    ]
    metas.sort(key=lambda m: m.id)
    return metas

@router.get("/mq/{mq_id}", response_model=MicroQuiz)
def get_mq(mq_id: str, shuffle: bool = True, seed: Optional[int] = None):
    """Fetch a micro-quiz. Optionally shuffle item order (deterministic with seed)."""
    if mq_id not in ITEM_BANK:
        raise HTTPException(404, f"Unknown MQ: {mq_id}")
    mq = ITEM_BANK[mq_id]
    if not mq.items:
        return mq
    items = list(mq.items)
    if shuffle:
        rnd = random.Random(seed if seed is not None else time.time_ns())
        rnd.shuffle(items)
    return MicroQuiz(**mq.dict(exclude={"items"}), items=items)

@router.post("/submit", response_model=SubmitResult)
def submit(payload: SubmitPayload):
    """Score an MQ submission, emit analytics, and add Gemini feedback for non-MC items (kept out of grading)."""
    if payload.mq_id not in ITEM_BANK:
        raise HTTPException(404, f"Unknown MQ: {payload.mq_id}")
    mq = ITEM_BANK[payload.mq_id]
    bank_by_id = {i.id: i for i in mq.items}

    results: List[ItemResult] = []
    for att in payload.attempts:
        item = bank_by_id.get(att.item_id)
        if not item:
            raise HTTPException(400, f"Item not in MQ: {att.item_id}")
        res = _score_item(item, att.response)

        # Add per-item LLM feedback ONLY for non-MC items (fitb) and only when incorrect
        if (item.type == "fitb") and (not res.correct):
            fb = _gen_feedback_fitb(
                prompt=item.prompt,
                student_text=str(att.response),
                expected=str(item.answer),
                error_class=item.error_class_on_miss,
            )
            if fb:
                res.feedback = fb

        results.append(res)

        # analytics per item
        ANALYTICS.append({
            "ts": int(time.time() * 1000),
            "session_id": payload.session_id,
            "mq_id": payload.mq_id,
            "item_id": item.id,
            "lo_ids": item.lo_ids,
            "pass_fail": int(res.correct),
            "attempts": payload.attempt_number or 1,
            "time_ms": att.time_ms or 0,
            "error_class": res.error_class,
            "remedial_clicked": False,  # front-end can POST later to flip this
        })

    total_awarded = sum(r.marks_awarded for r in results)
    total_possible = mq.total_marks

    # Mark that we've seen a graded attempt (lecturer can keep first-only later)
    key = (payload.session_id, payload.mq_id)
    FIRST_GRADED_REC[key] = FIRST_GRADED_REC.get(key, False) or True

    return SubmitResult(
        session_id=payload.session_id,
        mq_id=payload.mq_id,
        attempt_number=(payload.attempt_number or 1),
        results=results,
        total_awarded=total_awarded,
        total_possible=total_possible,
    )

@router.get("/next")
def next_mq(
    last_mq_id: Optional[str] = None,
    recent_micro_lessons: Optional[List[str]] = Query(default=None),
):
    """
    Simple helper:
     - If lessons are not live, advance sequentially (mq1->mq2->...).
     - When lessons are live, you can switch to "3 lessons => MQ" by passing recent_micro_lessons.
    """
    mq_ids = sorted(ITEM_BANK.keys())
    if not mq_ids:
        raise HTTPException(404, "No MQs available")

    if recent_micro_lessons:
        # Placeholder: later choose by LO overlap. For now, return earliest MQ not yet taken.
        return {"mq_id": mq_ids[0]}

    if not last_mq_id or last_mq_id not in ITEM_BANK:
        return {"mq_id": mq_ids[0]}
    idx = mq_ids.index(last_mq_id)
    nxt = mq_ids[min(idx + 1, len(mq_ids) - 1)]
    return {"mq_id": nxt}

@router.get("/analytics/attempts")
def export_analytics(format: Literal["json", "csv"] = "json"):
    """Dump analytics for quick lecturer review (prototype only)."""
    if format == "json":
        return ANALYTICS
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=[
        "ts","session_id","mq_id","item_id","lo_ids","pass_fail","attempts","time_ms","error_class","remedial_clicked"
    ])
    writer.writeheader()
    for row in ANALYTICS:
        r = dict(row)
        r["lo_ids"] = "|".join(map(str, r.get("lo_ids", [])))
        writer.writerow(r)
    return out.getvalue()
