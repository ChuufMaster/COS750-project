# SUITE-DTC-001 — Test Instructions for the Grader

This folder contains the unit tests that validate learner submissions for T-DTC-001 (Factory Method).

## Expected submission

- The grader mounts the learner's files into a working dir.
- Required file: `main.cpp` (see `compile.json:entryPoint`).
- The tests will include and/or link against the submission as needed.

## Build & Run (conceptual)

1. Compile with GCC 13, C++20, and flags from `compile.json`.
2. Link test sources with the learner's compiled objects.
3. Run the produced test binary in the sandbox.
4. Emit JUnit XML to `build/test-results/results.xml`.

## What is tested

- `Product` is an abstract base with `std::string Operation() const`.
- `ConcreteProductA` overrides `Operation()` and returns a non-empty identifier (e.g., "A").
- `Creator` declares `FactoryMethod() const -> Product*` and `DoSomething() const`.
- `ConcreteCreatorA::FactoryMethod()` returns a `Product*` to a `ConcreteProductA`.
- `Creator::DoSomething()` obtains a product via `FactoryMethod()` and uses its `Operation()` result.

## Scoring mapping (rubric.json)

- Compile success: 10 pts.
- Unit tests (behavioral correctness): 70 pts.
- Design fidelity checks (names/structure): 20 pts.

> Note: Actual test source files (.cpp/.hpp) belong in this directory next to this README and are invoked by the grader's build script/tooling.
