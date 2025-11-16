# scripts/full_mock_student.py

import json
import requests

BASE = "http://localhost:8000"
STUDENT_ID = "mock-student-001"
SESSION_ID = "sess-mock-full-001"

# One mid-ability COS214 student answering all MQs
MOCK_ANSWERS = {
    "mq1": {
        "mq1_q1": "A",
        "mq1_q2": (
            "Because the client should depend only on the Creator and Product "
            "abstractions, not on concrete classes. If the client constructs "
            "concrete types directly, you have to change client code every time "
            "you add a new variant, instead of just adding a new ConcreteCreator "
            "subclass."
        ),
        "mq1_q3": "A",
        "mq1_q4": "product object",
        "mq1_q5": "A",
    },
    "mq2": {
        "mq2_q1": (
            "DocumentFactory is the Creator, PdfFactory is the ConcreteCreator, "
            "Document is the Product, and PdfDocument is the ConcreteProduct."
        ),
        "mq2_q2": (
            "In UML you mark the Creator as abstract by writing the class name in "
            "italics or adding the {abstract} property/stereotype on the class."
        ),
        "mq2_q3": "Product",
        "mq2_q4": "B",
    },
    "mq3": {
        "mq3_q1": (
            "I modelled an abstract Creator class with a virtual factory operation "
            "make() that returns Product. Two ConcreteCreators inherit from Creator "
            "and override make() to create different ConcreteProduct subclasses. "
            "There is an abstract Product base class and ConcreteProduct classes "
            "that inherit from it. Generalisation arrows go from each "
            "ConcreteCreator to Creator and from each ConcreteProduct to Product, "
            "and all factory methods return Product, not a concrete type."
        ),
        "mq3_q2": (
            "Yes, there is a complete Factory Method structure. There is a Creator "
            "class with a factory method that returns the Product base type, at least "
            "one ConcreteCreator that overrides the factory method, and matching "
            "Product / ConcreteProduct classes. The ConcreteCreators create "
            "ConcreteProducts but the client only depends on the Creator and Product "
            "types."
        ),
        "mq3_q3": "A",
    },
    "mq4": {
        "mq4_q1": ["A", "B"],
        "mq4_q2": "virtual",
        "mq4_q3": "B",
        "mq4_q4": (
            "EasyLevelFactory acts as a ConcreteCreator in the Factory Method pattern. "
            "Its overridden make() function constructs and returns an EasyLevel "
            "object, which is the ConcreteProduct implementing the Level (Product) "
            "interface."
        ),
    },
    "mq5": {
        "mq5_q1": "B",
        "mq5_q2": (
            "Instead of including ConcreteA.h and calling new ConcreteA() directly, "
            "the client should use the Creator interface only. For example:\n\n"
            "Creator& factory = getFactory();\n"
            "std::unique_ptr<Product> p = factory.make();\n"
            "p->doWork();\n\n"
            "The client depends only on Creator and Product and never mentions or "
            "constructs ConcreteA or any other concrete product."
        ),
    },
    "mq6": {
        "mq6_q1": "A",
        "mq6_q2": "B",
        "mq6_q3": (
            "I would add a new ConcreteProductB class that derives from Product, and "
            "a matching ConcreteCreatorB that derives from Creator and overrides the "
            "factory method to create and return a ConcreteProductB. The client still "
            "talks only to Creator and Product, so no client code needs to change."
        ),
    },
}


def submit_mock_attempt_for_mq(mq_id: str):
    answers = MOCK_ANSWERS[mq_id]

    attempts = []
    for item_id, response in answers.items():
        attempts.append(
            {
                "item_id": item_id,
                "response": response,
                "time_ms": 10000,  # dummy timing
            }
        )

    payload = {
        "student_id": STUDENT_ID,
        "session_id": SESSION_ID,
        "mq_id": mq_id,
        "attempts": attempts,      # matches SubmitPayload.attempts
        "attempt_number": 1,
    }

    print(f"\n=== Submitting mock attempt for {mq_id} ===")
    print(json.dumps(payload, indent=2))

    res = requests.post(f"{BASE}/quiz/submit", json=payload)
    print("Status:", res.status_code)
    try:
        print("Response JSON:")
        print(json.dumps(res.json(), indent=2))
    except Exception:
        print("Raw response text:")
        print(res.text)


def main():
    # Optional: ping root to make sure backend is alive
    try:
        ping = requests.get(f"{BASE}/")
        print("[Ping] / ->", ping.status_code, ping.text)
    except Exception as e:
        print("Backend not reachable:", e)
        return

    for mq_id in sorted(MOCK_ANSWERS.keys()):
        submit_mock_attempt_for_mq(mq_id)


if __name__ == "__main__":
    main()