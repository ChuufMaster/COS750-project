from __future__ import annotations

import csv
import io
import json
import os
import random
import time
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

# ---------------------------------
# Gemini: optional formative helper
# ---------------------------------

# Set QUIZ_USE_GEMINI_FEEDBACK=0 to disable all LLM calls from this module.
USE_LLM_FEEDBACK = os.getenv("QUIZ_USE_GEMINI_FEEDBACK", "1") == "1"
ITEM_BANK: Dict[str, MicroQuiz] = {}
ANALYTICS: List[Dict[str, Any]] = []
FIRST_GRADED_REC: Dict[tuple, bool] = {}

ANALYTICS_JSONL_PATH = os.getenv("QUIZ_ANALYTICS_JSONL", "data/quiz_analytics.jsonl")
ANALYTICS_CSV_PATH   = os.getenv("QUIZ_ANALYTICS_CSV",   "data/quiz_analytics.csv")

try:
    # When running from project root: uvicorn backend.main:app
    from backend.services import gemini as gx
except ImportError:
    try:
        # When running from inside backend/: uvicorn main:app
        from services import gemini as gx
    except Exception:
        gx = None  # degrade gracefully if Gemini client is not available

router = APIRouter()

# -------------------------------
# Data models (wire & internal)
# -------------------------------

# Non-MCQ types are all graded via Gemini in _score_item.
ItemType = Literal[
    "mcq_single",   # one option key
    "mcq_multi",    # multiple option keys
    "fitb",         # short phrase / term
    "short_text",   # 1–3 sentence justification / explanation
    "code_text",    # short C++ snippet or pseudo-code
    "uml_json",     # UML workspace JSON string
]

class ItemOption(BaseModel):
    key: str
    text: str


class Item(BaseModel):
    id: str
    type: ItemType
    prompt: str
    options: Optional[List[ItemOption]] = None  # mcq_* only
    # For MCQ this is the key(s); for non-MCQ this is the "model answer" / memo snippet.
    answer: Any
    marks: int = 1
    lo_ids: List[int] = Field(default_factory=list)  # Learning Outcomes (from ID doc)
    error_class_on_miss: Optional[str] = None  # coarse error tag


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
    student_id: Optional[str] = None
    session_id: str
    mq_id: str
    attempts: List[ItemAttempt]
    # Front-end may track attempts; we also log it for analytics.
    attempt_number: Optional[int] = 1


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
# Tracks whether we have seen at least one graded attempt; a reporting layer
# can later enforce "first graded attempt only" for summative use.
FIRST_GRADED_REC: Dict[tuple, bool] = {}  # (session_id, mq_id) -> seen_first_graded


# -------------------------------
# Helpers
# -------------------------------

def _norm(s: str) -> str:
    return (s or "").strip().lower()


def _resp_text(resp: Any) -> str:
    """
    Extract plain text from a Gemini response, tolerant to SDK surface changes.
    """
    for attr in ("text", "output_text"):
        if hasattr(resp, attr):
            val = getattr(resp, attr)
            if val is not None:
                return str(val)
    return str(resp)


def _score_mcq(item: Item, resp: Any) -> ItemResult:
    """
    Deterministic scoring for MCQ items.
    """
    correct = False
    exp = item.answer
    awarded = 0

    if item.type == "mcq_single":
        correct = str(resp) == str(exp)
    elif item.type == "mcq_multi":
        # Order-insensitive comparison
        correct = set(map(str, (resp or []))) == set(map(str, exp))
    else:
        raise HTTPException(400, f"_score_mcq called for non-MCQ item type: {item.type}")

    if correct:
        awarded = item.marks

    # Simple static hint based on error_class; MCQs do not need LLM for grading.
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


def _grade_non_mcq_with_llm(item: Item, resp: Any) -> Optional[ItemResult]:
    """
    Ask Gemini to grade a non-MCQ answer and return marks + feedback.

    Returns ItemResult on success, or None on any failure (caller will fall back
    to deterministic scoring).
    """
    if not USE_LLM_FEEDBACK or gx is None:
        return None

    student_text = ("" if resp is None else str(resp)).strip()

    system_instruction = (
        "You are a strict but fair university teaching assistant for COS214, an "
        "Object-Oriented Programming and Software Engineering module that uses C++, UML, "
        "and Gang of Four design patterns, with a special focus on the Factory Method pattern.\n\n"
        "Your primary roles are:\n"
        "1. Grade student answers for non-multiple-choice micro-quiz questions "
        "(for example fill-in-the-blank, short text, code, UML, or structured JSON representing a UML diagram).\n"
        "2. Give short, high-quality formative feedback that helps the student improve on the same concept next time.\n\n"
        "You will receive:\n"
        "- the question prompt,\n"
        "- the maximum points for this item (max_points),\n"
        "- a short expected answer or memorandum snippet, and\n"
        "- the student's answer text (and possibly extra context).\n\n"
        "Your job:\n"
        "1) Assign an integer score from 0 to max_points (inclusive).\n"
        "2) Provide a brief explanation of your reasoning.\n"
        "3) Provide a short piece of advice on how the student can improve.\n\n"
        "General grading rules:\n"
        "- Treat the expected answer or memo snippet as the gold standard.\n"
        "- Award full marks when the student's answer captures the same idea, even if the wording differs or uses correct synonyms.\n"
        "- Award partial marks only if the student shows some correct understanding that is clearly related to the expected answer.\n"
        "- Award 0 if the answer is irrelevant, fundamentally incorrect, or blank.\n"
        "- Never exceed the stated maximum mark and do not award marks for criteria that the memo or rubric does not mention.\n"
        "- If evidence in the student's answer is ambiguous or missing, say that you cannot justify awarding full credit and score "
        "conservatively rather than guessing.\n"
        "- Do not talk about learning outcome numbers, internal error tags, or any internal marking mechanics.\n\n"
        "Feedback style:\n"
        "- Constructive: always give at least one actionable suggestion for improvement.\n"
        "- Encouraging: keep the tone honest but supportive.\n"
        "- Polite: use professional, respectful wording, no sarcasm.\n"
        "- Relevant: focus strictly on the student's work and the targeted concept.\n"
        "- Concise: usually 1 to 3 sentences in total, avoiding repetition.\n"
        "- Corrective: clearly point out any misconception or missing requirement.\n"
        "- Prefer pointing the student to the underlying rule or concept (for example that the client should call `Creator::make()` "
        "instead of constructing concretes directly) rather than simply dumping the full correct answer, unless the memo clearly "
        "requires the exact wording.\n\n"
        "Output format for this task:\n"
        "- Respond ONLY with a single compact JSON object of the form:\n"
        "  {\"score\": number, \"reasons\": string, \"advice\": string}\n"
        "- \"score\" must be an integer between 0 and max_points (inclusive).\n"
        "- Do not include any extra keys.\n"
        "- Do not add any text before or after the JSON, and do not wrap it in Markdown.\n\n"
        "Use clear, precise technical language suitable for an undergraduate software engineering course. "
        "Unless explicitly asked to use another language, respond in English."
    )

    parts = [
        gx.part_text(f"Question: {item.prompt}"),
        gx.part_text(f"Max points (max_points): {item.marks}"),
        gx.part_text(f"Expected answer or memo snippet: {item.answer}"),
        gx.part_text(f"Student answer: {student_text or '[BLANK]'}"),
    ]
    if item.error_class_on_miss:
        parts.append(
            gx.part_text(
                "Internal error tag (for your reasoning only, do not echo verbatim): "
                f"{item.error_class_on_miss}"
            )
        )

    try:
        resp_obj = gx.generate_with_retry(
            parts=parts,
            system_instruction=system_instruction,
            json_mode=True,   # expect strict JSON
            temperature=1.0,
            top_p=0.95,
            max_output_tokens=256,
            seed=42424242,
        )
        raw_text = _resp_text(resp_obj)
        data = json.loads(raw_text)

        # Parse and clamp score
        score_val = data.get("score", 0)
        try:
            score = int(round(float(score_val)))
        except Exception:
            score = 0

        if score < 0:
            score = 0
        if score > item.marks:
            score = item.marks

        reasons = (data.get("reasons") or "").strip()
        advice = (data.get("advice") or "").strip()
        pieces = [p for p in (reasons, advice) if p]
        feedback = "\n".join(pieces) if pieces else None

        correct = score == item.marks

        return ItemResult(
            item_id=item.id,
            correct=correct,
            marks_awarded=score,
            expected=item.answer,
            feedback=feedback,
            lo_ids=item.lo_ids,
            error_class=None if correct else item.error_class_on_miss,
        )
    except Exception:
        # Any API / parse error → caller will fall back to deterministic scoring.
        return None


def _score_item(item: Item, resp: Any) -> ItemResult:
    """
    Unified scoring entry point.

    - MCQ items are graded deterministically.
    - Non-MCQ items are graded by Gemini when available, with a simple
      deterministic fallback so the prototype still functions offline.
    """
    if item.type in ("mcq_single", "mcq_multi"):
        return _score_mcq(item, resp)

    # Non-MCQ: try Gemini first
    llm_result = _grade_non_mcq_with_llm(item, resp)
    if llm_result is not None:
        return llm_result

    # Fallback: simple exact-ish match against memo
    correct = _norm(str(resp)) == _norm(str(item.answer))
    marks_awarded = item.marks if correct else 0

    fb = None
    if not correct and item.error_class_on_miss:
        fb = f"Hint (offline): {item.error_class_on_miss.replace('-', ' ')}."

    return ItemResult(
        item_id=item.id,
        correct=correct,
        marks_awarded=marks_awarded,
        expected=item.answer,
        feedback=fb,
        lo_ids=item.lo_ids,
        error_class=None if correct else item.error_class_on_miss,
    )


def _calc_total(items: List[Item]) -> int:
    return sum(i.marks for i in items)


def _ensure_item_bank_seeded() -> None:
    """
    Seed the in-memory MQ bank using the blueprint in the ID document.
    This runs once on first import.

    Counts:
      MQ1: 5 items   (intent, recognition, short justification)
      MQ2: 4 items   (UML roles / labels / notation)
      MQ3: 3 items   (UML build from code + scan)
      MQ4: 4 items   (code role cues, trace, lifecycle)
      MQ5: 2 items   (refactor + “find the seam” MCQ)
      MQ6: 3 items   (extend + FM vs AF vs Simple triage)
    """
    if ITEM_BANK:
        return

    # ---------------- MQ1 ----------------
    # Intent and recognition – LOs 1–4, 6, 9
    mq1_items = [
        Item(
            id="mq1_q1",
            type="mcq_single",
            prompt="Factory Method is a ___ pattern that lets a class ___.",
            options=[
                ItemOption(
                    key="A",
                    text="creational; defer object creation to subclasses",
                ),
                ItemOption(
                    key="B",
                    text="structural; share implementation between related classes",
                ),
                ItemOption(
                    key="C",
                    text="behavioral; let objects notify observers of changes",
                ),
            ],
            answer="A",
            marks=2,
            lo_ids=[1, 2, 3, 4],
            error_class_on_miss="intent-or-classification-misunderstood",
        ),
        Item(
            id="mq1_q2",
            type="short_text",
            prompt=(
                "In 2–3 sentences, explain in your own words why, in Factory Method, "
                "the client must not construct concrete types directly."
            ),
            answer=(
                "Because clients should depend only on Creator/Product abstractions. "
                "Concrete types are created inside factories so that new variants can be "
                "added by subclassing without changing client code."
            ),
            marks=2,
            lo_ids=[4, 6, 9],
            error_class_on_miss="client-still-constructs",
        ),
        Item(
            id="mq1_q3",
            type="mcq_single",
            prompt=(
                "Which situation is the best fit for applying Factory Method?"
            ),
            options=[
                ItemOption(
                    key="A",
                    text=(
                        "A game has a base Level class and many concrete level types. "
                        "New levels are added over time, and each level needs different "
                        "initialisation. You want to call makeLevel() polymorphically."
                    ),
                ),
                ItemOption(
                    key="B",
                    text=(
                        "You have many unrelated helper functions that you want to "
                        "group into one utility class with only static methods."
                    ),
                ),
                ItemOption(
                    key="C",
                    text=(
                        "You need to broadcast events from one subject to many observers "
                        "whenever state changes."
                    ),
                ),
            ],
            answer="A",
            marks=3,
            lo_ids=[4, 6, 9],
            error_class_on_miss="pattern-intent-misapplied",
        ),
        Item(
            id="mq1_q4",
            type="fitb",
            prompt=(
                "Complete the sentence: 'Factory Method lets subclasses decide which "
                "__________ to create.'"
            ),
            answer="product object",
            marks=1,
            lo_ids=[3, 4],
            error_class_on_miss="intent-phrase-incomplete",
        ),
        Item(
            id="mq1_q5",
            type="mcq_single",
            prompt=(
                "Which of the following is the correct GoF name for the pattern that "
                "delegates object creation to subclasses?"
            ),
            options=[
                ItemOption(key="A", text="Factory Method"),
                ItemOption(key="B", text="Factory Pattern"),
                ItemOption(key="C", text="Object Factory"),
            ],
            answer="A",
            marks=1,
            lo_ids=[1],
            error_class_on_miss="pattern-name-confused",
        ),
    ]
    ITEM_BANK["mq1"] = MicroQuiz(
        id="mq1",
        title="MQ1: Intent and recognition",
        desc="Why patterns, FM intent, and the rule that clients do not construct concretes.",
        items=mq1_items,
        total_marks=_calc_total(mq1_items),
        target_los=[1, 2, 3, 4, 6, 9],
    )

    # ---------------- MQ2 ----------------
    # Canonical UML roles – LOs 5, 7, 13
    mq2_items = [
        Item(
            id="mq2_q1",
            type="short_text",
            prompt=(
                "Consider a Factory Method design with four classes: "
                "DocumentFactory, PdfFactory, Document, and PdfDocument. "
                "Identify which is the Creator, ConcreteCreator, Product, and "
                "ConcreteProduct."
            ),
            answer=(
                "Creator = DocumentFactory; ConcreteCreator = PdfFactory; "
                "Product = Document; ConcreteProduct = PdfDocument."
            ),
            marks=3,
            lo_ids=[5, 7, 13],
            error_class_on_miss="uml-roles-mislabelled",
        ),
        Item(
            id="mq2_q2",
            type="short_text",
            prompt=(
                "In UML, how do you mark the Creator class as abstract in a "
                "Factory Method diagram? Describe the notation briefly."
            ),
            answer=(
                "Mark the Creator class as abstract, either by writing the class name "
                "in italics or by adding the {abstract} property/stereotype."
            ),
            marks=2,
            lo_ids=[5],
            error_class_on_miss="abstract-marker-misunderstood",
        ),
        Item(
            id="mq2_q3",
            type="fitb",
            prompt=(
                "In the UML for Factory Method, the factory operation's return type "
                "should be the base ______, not a concrete type."
            ),
            answer="Product",
            marks=1,
            lo_ids=[5, 13],
            error_class_on_miss="wrong-factory-return-type",
        ),
        Item(
            id="mq2_q4",
            type="mcq_single",
            prompt=(
                "In UML, which relationship symbol best represents ConcreteCreator "
                "inheriting from Creator?"
            ),
            options=[
                ItemOption(key="A", text="Association (plain line)"),
                ItemOption(key="B", text="Generalisation (open triangle arrow)"),
                ItemOption(key="C", text="Aggregation (diamond)"),
            ],
            answer="B",
            marks=1,
            lo_ids=[5, 13],
            error_class_on_miss="uml-relationship-misused",
        ),
    ]
    ITEM_BANK["mq2"] = MicroQuiz(
        id="mq2",
        title="MQ2: Canonical UML roles",
        desc="Label Creator/Product roles, abstract markers, and factory return types.",
        items=mq2_items,
        total_marks=_calc_total(mq2_items),
        target_los=[5, 7, 13],
    )

    # ---------------- MQ3 ----------------
    # Code ⇔ UML – LOs 10, 11, 12, 23
    mq3_items = [
        Item(
            id="mq3_q1",
            type="uml_json",
            prompt=(
                "From the given C++ sketch in the question text (Creator with a virtual "
                "factory make() that returns Product and two ConcreteCreators), build a "
                "correct Factory Method UML in the UML workspace. Submit the UML "
                "workspace JSON as your answer."
            ),
            answer=(
                "The UML must contain Creator, at least one ConcreteCreator, Product "
                "and ConcreteProduct classes, with generalisation arrows from "
                "ConcreteCreator to Creator and from ConcreteProduct to Product. "
                "Creator declares an abstract/virtual factory operation returning "
                "Product; ConcreteCreators override it to create ConcreteProducts."
            ),
            marks=3,
            lo_ids=[10, 11, 23],
            error_class_on_miss="uml-structure-incomplete",
        ),
        Item(
            id="mq3_q2",
            type="short_text",
            prompt=(
                "You are given a larger UML diagram in the question. "
                "State whether a complete Factory Method structure is present. "
                "If it is, name the Creator and Product roles; if not, briefly justify "
                "why FM is not present."
            ),
            answer=(
                "A correct answer either (1) identifies a consistent set of Creator, "
                "ConcreteCreator, Product, and ConcreteProduct classes with a factory "
                "operation returning Product, or (2) explains clearly that some "
                "essential part of FM is missing (for example, no overriding factory, "
                "no abstract Creator, or factory returns a concrete type)."
            ),
            marks=2,
            lo_ids=[12, 23],
            error_class_on_miss="fm-not-detected-in-uml",
        ),
        Item(
            id="mq3_q3",
            type="mcq_single",
            prompt=(
                "[IMAGE REQUIRED: uml_mq3_q3.png] Which diagram correctly shows the "
                "factory operation on Creator returning Product (not a concrete type)?"
            ),
            options=[
                ItemOption(key="A", text="Diagram A"),
                ItemOption(key="B", text="Diagram B"),
                ItemOption(key="C", text="Diagram C"),
            ],
            answer="A",
            marks=2,
            lo_ids=[10, 12, 23],
            error_class_on_miss="factory-signature-wrong",
        ),
    ]
    ITEM_BANK["mq3"] = MicroQuiz(
        id="mq3",
        title="MQ3: Code ⇔ UML mapping",
        desc="Build FM UML from code and scan larger UML diagrams for FM.",
        items=mq3_items,
        total_marks=_calc_total(mq3_items),
        target_los=[10, 11, 12, 23],
    )

    # ---------------- MQ4 ----------------
    # Code cues and conformance – LOs 14, 17–20
    mq4_items = [
        Item(
            id="mq4_q1",
            type="mcq_multi",
            prompt="Select all cues that a class is a Creator in Factory Method.",
            options=[
                ItemOption(
                    key="A",
                    text="Declares a virtual factory that returns a Product base type",
                ),
                ItemOption(
                    key="B",
                    text=(
                        "Overrides a factory and returns a ConcreteProduct "
                        "(via Product*)"
                    ),
                ),
                ItemOption(
                    key="C",
                    text="Has a public field of ConcreteProduct type",
                ),
            ],
            answer=["A", "B"],
            marks=2,
            lo_ids=[14, 17, 18],
            error_class_on_miss="role-cues-misidentified",
        ),
        Item(
            id="mq4_q2",
            type="fitb",
            prompt=(
                "To delete via a Product* safely in C++, Product needs a ______ "
                "destructor."
            ),
            answer="virtual",
            marks=2,
            lo_ids=[19, 20],
            error_class_on_miss="missing-virtual-destructor",
        ),
        Item(
            id="mq4_q3",
            type="mcq_single",
            prompt=(
                "[IMAGE REQUIRED: code_mq4_q3.png] Which snippet will cause undefined "
                "behaviour when deleting via Product*?"
            ),
            options=[
                ItemOption(
                    key="A",
                    text="Snippet A: Product has a virtual destructor ~Product().",
                ),
                ItemOption(
                    key="B",
                    text="Snippet B: Product lacks a virtual destructor.",
                ),
                ItemOption(
                    key="C",
                    text=(
                        "Snippet C: Product destructor is defaulted and declared virtual."
                    ),
                ),
            ],
            answer="B",
            marks=1,
            lo_ids=[19, 20],
            error_class_on_miss="lifecycle-contract-missed",
        ),
        Item(
            id="mq4_q4",
            type="short_text",
            prompt=(
                "You are given C++ code in the question where LevelFactory has a "
                "virtual make() returning std::unique_ptr<Level>, and "
                "EasyLevelFactory overrides make() to return a "
                "std::unique_ptr<EasyLevel>. Identify the FM role played by "
                "EasyLevelFactory and name the concrete product its factory "
                "override constructs."
            ),
            answer=(
                "EasyLevelFactory is a ConcreteCreator. Its make() override constructs "
                "an EasyLevel, which is a ConcreteProduct."
            ),
            marks=3,
            lo_ids=[14, 17, 18],
            error_class_on_miss="role-or-trace-misunderstood",
        ),
    ]
    ITEM_BANK["mq4"] = MicroQuiz(
        id="mq4",
        title="MQ4: Code role cues and lifecycle",
        desc="Classify FM roles in code, trace overrides, and check lifecycle rules.",
        items=mq4_items,
        total_marks=_calc_total(mq4_items),
        target_los=[14, 17, 18, 19, 20],
    )

    # ---------------- MQ5 ----------------
    # Refactor – LO 21 (one coding item)
    mq5_items = [
        Item(
            id="mq5_q1",
            type="mcq_single",
            prompt="Which change removes client coupling to Concrete in a refactor to Factory Method?",
            options=[
                ItemOption(
                    key="A",
                    text="Client includes ConcreteA.h directly and calls new ConcreteA().",
                ),
                ItemOption(
                    key="B",
                    text="Client calls Creator::make() and uses Product* only.",
                ),
                ItemOption(
                    key="C",
                    text=(
                        "Client switches on an enum and uses new ConcreteA()/new "
                        "ConcreteB() inside the client."
                    ),
                ),
            ],
            answer="B",
            marks=2,
            lo_ids=[21],
            error_class_on_miss="client-still-constructs",
        ),
        Item(
            id="mq5_q2",
            type="code_text",
            prompt=(
                "You are given a naive C++ client in the question that includes "
                "ConcreteA.h and calls new ConcreteA() directly. Refactor the client "
                "to Factory Method: write a short C++ snippet showing how the client "
                "should obtain a Creator and call Creator::make() so that the client "
                "no longer mentions or constructs Concrete types."
            ),
            answer=(
                "The refactored client depends only on Creator and Product. It holds a "
                "Creator (or factory) interface, calls factory.make() (or equivalent) "
                "to obtain a Product*, and uses the Product interface. The client code "
                "no longer includes Concrete*.h and contains no 'new ConcreteX' calls."
            ),
            marks=5,
            lo_ids=[21],
            error_class_on_miss="refactor-incomplete-or-client-still-coupled",
        ),
    ]
    ITEM_BANK["mq5"] = MicroQuiz(
        id="mq5",
        title="MQ5: Refactor to Factory Method",
        desc="Move creation into the factory and keep the client abstract.",
        items=mq5_items,
        total_marks=_calc_total(mq5_items),
        target_los=[21],
    )

    # ---------------- MQ6 ----------------
    # Extend and differentiate – LOs 12, 15, 22
    mq6_items = [
        Item(
            id="mq6_q1",
            type="mcq_single",
            prompt=(
                "You add a new ConcreteProductB and a matching ConcreteCreatorB while "
                "the client code stays unchanged. Which pattern does this cue most "
                "strongly suggest?"
            ),
            options=[
                ItemOption(key="A", text="Factory Method"),
                ItemOption(key="B", text="Simple Factory"),
                ItemOption(key="C", text="Abstract Factory"),
            ],
            answer="A",
            marks=2,
            lo_ids=[12, 22],
            error_class_on_miss="pattern-triage-confusion",
        ),
        Item(
            id="mq6_q2",
            type="mcq_single",
            prompt=(
                "A scenario mentions that 'families of related products must always be "
                "chosen together in fixed combinations.' Which pattern is this a "
                "decisive cue for?"
            ),
            options=[
                ItemOption(key="A", text="Factory Method"),
                ItemOption(key="B", text="Abstract Factory"),
                ItemOption(key="C", text="Simple Factory"),
            ],
            answer="B",
            marks=2,
            lo_ids=[12, 15],
            error_class_on_miss="af-vs-fm-confusion",
        ),
        Item(
            id="mq6_q3",
            type="short_text",
            prompt=(
                "You already have a working Factory Method design with Product, "
                "ConcreteProductA, Creator, and ConcreteCreatorA. Describe, in "
                "code-level terms, how you would extend this design to support a new "
                "ConcreteProductB without changing the client."
            ),
            answer=(
                "Add a new ConcreteProductB subclass of Product and a matching "
                "ConcreteCreatorB subclass of Creator that overrides the factory to "
                "create ConcreteProductB. The client continues to depend only on "
                "Creator and Product and does not change."
            ),
            marks=3,
            lo_ids=[15, 22],
            error_class_on_miss="extension-mechanics-missed",
        ),
    ]
    ITEM_BANK["mq6"] = MicroQuiz(
        id="mq6",
        title="MQ6: Extension and pattern discrimination",
        desc="Extend an existing FM cleanly and distinguish FM vs AF vs Simple.",
        items=mq6_items,
        total_marks=_calc_total(mq6_items),
        target_los=[12, 15, 22],
    )


_ensure_item_bank_seeded()

def _persist_analytic_row(row: Dict[str, Any]) -> None:
    """
    Append one item-level analytics row to a local JSONL file
    and keep a CSV mirror. Purely local, no logins, no cloud.
    """
    # Ensure dirs exist
    json_dir = os.path.dirname(ANALYTICS_JSONL_PATH)
    if json_dir:
        os.makedirs(json_dir, exist_ok=True)
    csv_dir = os.path.dirname(ANALYTICS_CSV_PATH)
    if csv_dir:
        os.makedirs(csv_dir, exist_ok=True)

    # JSONL canonical storage
    with open(ANALYTICS_JSONL_PATH, "a", encoding="utf-8") as jf:
        jf.write(json.dumps(row, ensure_ascii=False) + "\n")

    # CSV mirror
    file_exists = os.path.isfile(ANALYTICS_CSV_PATH)
    fieldnames = [
        "ts",
        "student_id",
        "session_id",
        "mq_id",
        "item_id",
        "lo_ids",
        "pass_fail",
        "attempts",
        "time_ms",
        "error_class",
        "remedial_clicked",
        "marks_awarded",
        "marks_possible",
    ]
    with open(ANALYTICS_CSV_PATH, "a", newline="", encoding="utf-8") as cf:
        writer = csv.DictWriter(cf, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        r = dict(row)
        r["lo_ids"] = "|".join(map(str, r.get("lo_ids", [])))
        writer.writerow(r)

# -------------------------------
# Routes
# -------------------------------

@router.get("/mqs", response_model=List[MQMeta])
def list_mqs() -> List[MQMeta]:
    """
    Catalog of available MQs (for Start-MQ flow while lessons are non-MVP).
    """
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
def get_mq(mq_id: str, shuffle: bool = True, seed: Optional[int] = None) -> MicroQuiz:
    """
    Fetch a micro-quiz. Optionally shuffle item order (deterministic with seed).
    """
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
def submit(payload: SubmitPayload) -> SubmitResult:
    """
    Score an MQ submission, emit analytics, and add Gemini-based grading +
    feedback for all non-MCQ items (kept out of any high-stakes use).
    Also persists item-level analytics to local JSONL + CSV files.
    """
    if payload.mq_id not in ITEM_BANK:
        raise HTTPException(404, f"Unknown MQ: {payload.mq_id}")
    mq = ITEM_BANK[payload.mq_id]
    bank_by_id = {i.id: i for i in mq.items}

    results: List[ItemResult] = []

    for att in payload.attempts:
        item = bank_by_id.get(att.item_id)
        if not item:
            raise HTTPException(400, f"Item not in MQ: {att.item_id}")

        # Grade this item (MCQ deterministically; others via Gemini + fallback)
        res = _score_item(item, att.response)
        results.append(res)

        # Build a single item-level analytics record
        row = {
            "ts": int(time.time() * 1000),
            "student_id": payload.student_id or "",
            "session_id": payload.session_id,
            "mq_id": payload.mq_id,
            "item_id": item.id,
            "lo_ids": item.lo_ids,
            "pass_fail": int(res.correct),
            "attempts": payload.attempt_number or 1,
            "time_ms": att.time_ms or 0,
            "error_class": res.error_class,
            "remedial_clicked": False,  # front-end can POST later to flip this
            "marks_awarded": res.marks_awarded,
            "marks_possible": item.marks,
        }

        # Keep in-memory for quick JSON export
        ANALYTICS.append(row)
        # Persist to disk (JSONL + CSV mirror)
        _persist_analytic_row(row)

    total_awarded = sum(r.marks_awarded for r in results)
    total_possible = mq.total_marks

    # Mark that we've seen a graded attempt (for possible first-attempt-only logic)
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
    """
    Dump analytics for quick lecturer review (prototype only).
    NOTE: all data is kept in-memory only for this COS750 prototype.
    """
    if format == "json":
        return ANALYTICS
    out = io.StringIO()
    writer = csv.DictWriter(
        out,
        fieldnames=[
            "ts",
            "session_id",
            "mq_id",
            "item_id",
            "lo_ids",
            "pass_fail",
            "attempts",
            "time_ms",
            "error_class",
            "remedial_clicked",
        ],
    )
    writer.writeheader()
    for row in ANALYTICS:
        r = dict(row)
        r["lo_ids"] = "|".join(map(str, r.get("lo_ids", [])))
        writer.writerow(r)
    return out.getvalue()
