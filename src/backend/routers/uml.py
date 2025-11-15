from fastapi import APIRouter

router = APIRouter()


@router.get("/diagrams")
def get_diagrams():
    return [
        {
            "id": 1,
            "question": "What is the Factory design pattern?",
            "options": ["A", "B", "C"],
            "answer": "A",
        },
        {
            "id": 2,
            "question": "Which language feature is used to implement factories?",
            "options": ["Virtual functions", "Templates", "Both"],
            "answer": "Both",
        },
    ]
