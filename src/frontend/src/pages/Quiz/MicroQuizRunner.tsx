// src/pages/Quiz/MicroQuizRunner.tsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import CodeViewer from "../../components/CodeViewer";
import ApollonUmlEditor, {
  type ApollonUmlEditorHandle,
} from "../../components/ApollonUmlEditor";
import { v4 as uuidv4 } from "uuid";
import { API_URL } from "../../config";
import { Editor } from "@monaco-editor/react";

type ItemType =
  | "mcq_single"
  | "mcq_multi"
  | "fitb"
  | "short_text"
  | "code_text"
  | "uml_json";

type ItemOption = {
  key: string;
  text: string;
};

type Item = {
  id: string;
  type: ItemType;
  prompt: string;
  options?: ItemOption[];
  marks: number;
  code_example?: string;
  image_url?: string;
};

type MicroQuiz = {
  id: string;
  title: string;
  desc: string;
  total_marks: number;
  items: Item[];
};

type ItemResult = {
  item_id: string;
  correct: boolean;
  marks_awarded: number;
  expected: any;
  feedback?: string | null;
  lo_ids: number[];
  error_class?: string | null;
};

type SubmitResult = {
  session_id: string;
  mq_id: string;
  attempt_number: number;
  results: ItemResult[];
  total_awarded: number;
  total_possible: number;
};

const SESSION_KEY = "fm-session-id";
const ATTEMPT_KEY = "fm-mq-attempts";
const STUDENT_KEY = "cos214_student_id"; // <-- same key as Home page

function getOrCreateSessionId(): string {
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      if ("randomUUID" in crypto) {
        id = uuidv4();
      } else {
        id = `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      }
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function nextAttemptNumber(mqId: string): number {
  try {
    const raw = window.localStorage.getItem(ATTEMPT_KEY);
    const parsed: Record<string, number> = raw ? JSON.parse(raw) : {};
    const next = (parsed[mqId] ?? 0) + 1;
    parsed[mqId] = next;
    window.localStorage.setItem(ATTEMPT_KEY, JSON.stringify(parsed));
    return next;
  } catch {
    return 1;
  }
}

const MicroQuizRunner: React.FC = () => {
  const { mqId } = useParams<{ mqId: string }>();
  const [mq, setMq] = useState<MicroQuiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const umlRefs = useRef<Record<string, ApollonUmlEditorHandle | null>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null); // <-- NEW

  // Load student ID once
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STUDENT_KEY) || "";
      const trimmed = raw.trim();
      setStudentId(trimmed.length > 0 ? trimmed : null);
    } catch {
      setStudentId(null);
    }
  }, []);

  useEffect(() => {
    if (!mqId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setResult(null);
        setAnswers({});
        const resp = await axios.get<MicroQuiz>(
          `${API_URL}/quiz/mq/${mqId}?shuffle=false`
        );
        setMq(resp.data);
      } catch (e: any) {
        console.error(e);
        setError("Could not load this micro-quiz from the server.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [mqId]);

  const handleSingleChange = (itemId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleMultiChange = (
    itemId: string,
    optionKey: string,
    checked: boolean
  ) => {
    setAnswers((prev) => {
      const current: string[] = Array.isArray(prev[itemId]) ? prev[itemId] : [];
      let next: string[];
      if (checked) {
        next = current.includes(optionKey) ? current : [...current, optionKey];
      } else {
        next = current.filter((k) => k !== optionKey);
      }
      return { ...prev, [itemId]: next };
    });
  };

  const handleTextChange = (itemId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  };

  const getResponseForItem = (item: Item) => {
    if (item.type === "uml_json") {
      const diagram = umlRefs.current[item.id]?.getModel();
      return diagram ?? null;
    }
    const value = answers[item.id];
    return value !== undefined && value !== "" ? value : null;
  };

  const handleSubmit = async () => {
    if (!mq) return;
    try {
      setSubmitting(true);
      setError(null);

      const sessionId = getOrCreateSessionId();
      const attemptNumber = nextAttemptNumber(mq.id);

      // Read student id again at submit time (in case they changed it and came back)
      let storedId: string | null = null;
      try {
        const raw = window.localStorage.getItem(STUDENT_KEY) || "";
        const trimmed = raw.trim();
        storedId = trimmed.length > 0 ? trimmed : null;
      } catch {
        storedId = null;
      }

      const payload = {
        session_id: sessionId,
        mq_id: mq.id,
        student_id: storedId, // ✅ now sent to backend
        attempt_number: attemptNumber,
        attempts: mq.items.map((item) => ({
          item_id: item.id,
          response: getResponseForItem(item),
          time_ms: 0,
        })),
      };

      const resp = await axios.post<SubmitResult>(
        `${API_URL}/quiz/submit`,
        payload
      );
      setResult(resp.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      console.error(e);
      setError("Submitting the micro-quiz failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <main className="mq-page">
      <header className="mq-header">
        <div>
          <p className="mq-kicker">Factory Method · Micro-quiz</p>
          <h1 className="mq-title">
            {mq ? mq.title : mqId ? mqId.toUpperCase() : "Micro-quiz"}
          </h1>
          {studentId && (
            <p className="mq-student-tag">
              Student: <strong>{studentId}</strong>
            </p>
          )}
        </div>
        {mq && <p className="mq-subtitle">{mq.desc}</p>}
        <div className="mq-header-actions">
          <Link to="/quiz" className="mq-link">
            ← Back to all micro-quizzes
          </Link>
        </div>
      </header>

      {loading && <p>Loading micro-quiz…</p>}
      {error && <p className="mq-error">{error}</p>}

      {mq && !loading && (
        <>
          {result && (
            <section className="mq-result-summary">
              <h2>
                Attempt #{result.attempt_number}: you scored{" "}
                <span className="mq-score">
                  {result.total_awarded} / {result.total_possible}
                </span>{" "}
                marks
              </h2>
              <p>
                You can review feedback below and optionally try again. Only
                your first graded attempt is used for lecturer analytics; later
                attempts are for your own practice.
              </p>
            </section>
          )}

          <section className="mq-items">
            {mq.items.map((item, index) => {
              const currentAnswer = answers[item.id];
              const itemResult = result?.results.find(
                (r) => r.item_id === item.id
              );

              return (
                <article key={item.id} className="mq-item">
                  <header className="mq-item-header">
                    <h3>
                      Q{index + 1} · {item.marks} mark
                      {item.marks !== 1 ? "s" : ""}
                    </h3>
                    <p className="mq-item-type">
                      Type:{" "}
                      {item.type === "mcq_single"
                        ? "Single-answer MCQ"
                        : item.type === "mcq_multi"
                        ? "Multi-select MCQ"
                        : item.type === "fitb"
                        ? "Fill-in-the-blank"
                        : item.type === "short_text"
                        ? "Short text"
                        : item.type === "code_text"
                        ? "Code (C++)"
                        : "UML workspace"}
                    </p>
                  </header>

                  <p className="mq-item-prompt">{item.prompt}</p>

                  {item.code_example && (
                    <div className="mq-placeholder-block">
                      <p className="mq-placeholder-label">Code example</p>
                      <div
                        className="mq-code-example-viewer"
                        style={{ minHeight: 120, marginBottom: 10 }}
                      >
                        <CodeViewer
                          code={item.code_example}
                          language="cpp"
                          height={200}
                        />
                      </div>
                    </div>
                  )}

                  {item.image_url && (
                    <div
                      className="mq-placeholder-block"
                      style={{ textAlign: "center" }}
                    >
                      <p className="mq-placeholder-label">Reference Image</p>
                      <img
                        src={item.image_url}
                        alt="Question reference"
                        className="mq-item-image"
                        style={{
                          width: "100%",
                          maxWidth: "750px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          margin: "3px auto 10px auto",
                        }}
                      />
                    </div>
                  )}

                  <div className="mq-item-input">
                    {item.type === "mcq_single" && item.options && (
                      <div className="mq-options">
                        {item.options.map((opt) => (
                          <label key={opt.key} className="mq-option">
                            <input
                              type="radio"
                              name={`q-${item.id}`}
                              value={opt.key}
                              checked={currentAnswer === opt.key}
                              onChange={() =>
                                handleSingleChange(item.id, opt.key)
                              }
                            />
                            <span className="mq-option-key">{opt.key}.</span>
                            <span>{opt.text}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {item.type === "mcq_multi" && item.options && (
                      <div className="mq-options">
                        {item.options.map((opt) => {
                          const arr: string[] = Array.isArray(currentAnswer)
                            ? currentAnswer
                            : [];
                          const checked = arr.includes(opt.key);
                          return (
                            <label key={opt.key} className="mq-option">
                              <input
                                type="checkbox"
                                value={opt.key}
                                checked={checked}
                                onChange={(e) =>
                                  handleMultiChange(
                                    item.id,
                                    opt.key,
                                    e.target.checked
                                  )
                                }
                              />
                              <span className="mq-option-key">{opt.key}.</span>
                              <span>{opt.text}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {(item.type === "fitb" || item.type === "short_text") && (
                      <textarea
                        className="mq-textarea"
                        rows={item.type === "fitb" ? 2 : 4}
                        value={currentAnswer ?? ""}
                        onChange={(e) =>
                          handleTextChange(item.id, e.target.value)
                        }
                        placeholder={
                          item.type === "fitb"
                            ? "Type your short answer here…"
                            : "Write a brief explanation (1–3 sentences)…"
                        }
                      />
                    )}

                    {item.type === "code_text" && (
                      <div className="mq-placeholder-block">
                        <p className="mq-placeholder-label">
                          Code answer (C++ snippet)
                        </p>

                        <Editor
                          height="400px"
                          defaultLanguage="cpp"
                          theme="vs-dark"
                          onChange={(value) => {
                            handleTextChange(item.id, value ?? "");
                          }}
                          value={
                            currentAnswer ??
                            `
// Write the relevant C++ snippet here
// (e.g., the refactored client using Creator::make()).
`
                          }
                          options={{
                            fontSize: 14,
                            minimap: { enabled: false },
                            automaticLayout: true,
                          }}
                        />
                      </div>
                    )}

                    {item.type === "uml_json" && (
                      <div className="mq-placeholder-block">
                        <p className="mq-placeholder-caption">
                          Create your Factory Method diagram.
                        </p>
                        <div
                          className="mq-uml-editor-shell"
                          style={{ minHeight: 360 }}
                        >
                          <ApollonUmlEditor
                            ref={(instance) => {
                              umlRefs.current[item.id] = instance ?? null;
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {itemResult && (
                    <footer
                      className={
                        "mq-item-feedback " +
                        (itemResult.correct
                          ? "mq-item-feedback-correct"
                          : "mq-item-feedback-incorrect")
                      }
                    >
                      <p className="mq-item-feedback-score">
                        Marks: {itemResult.marks_awarded} / {item.marks} ·{" "}
                        {itemResult.correct ? "Correct" : "Not yet correct"}
                      </p>
                      {itemResult.feedback && (
                        <p className="mq-item-feedback-text">
                          {itemResult.feedback}
                        </p>
                      )}
                      {itemResult.expected && (
                        <details className="mq-item-expected">
                          <summary>Show memo / expected answer</summary>
                          <pre>{String(itemResult.expected)}</pre>
                        </details>
                      )}
                    </footer>
                  )}
                </article>
              );
            })}
          </section>

          <section className="mq-actions">
            {!result && (
              <button
                className="mq-primary-button"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit micro-quiz"}
              </button>
            )}
            {result && (
              <>
                <button
                  className="mq-primary-button"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Submitting…" : "Try again (new attempt)"}
                </button>
                <button className="mq-secondary-button" onClick={handleReset}>
                  Clear answers
                </button>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
};

export default MicroQuizRunner;
