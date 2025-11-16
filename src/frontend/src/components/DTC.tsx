import React, { useEffect, useState } from "react";
import CodeEditor from "./CodeEditor";
import { fetchDTCTask, submitDTC } from "../pages/UML/helpers";

type DTCTask = {
  id?: string;
  type?: string;
  title?: string;
  description?: string;
  language?: string;
  prompt?: {
    kind?: string;
    url?: string; // relative, e.g. /static/UML/DTC/prompt.png
  };
  rubric?: any;
  testSuite?: string;
  [key: string]: any;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

function buildImageUrl(task?: DTCTask | null): string | undefined {
  const rel = task?.prompt?.url;
  if (!rel) return undefined;

  if (/^https?:\/\//i.test(rel)) {
    return rel;
  }

  const base = API_BASE.replace(/\/+$/, "");
  return `${base}${rel}`;
}

const DTC: React.FC = () => {
  const [task, setTask] = useState<DTCTask | null>(null);
  const [code, setCode] = useState<string>("");

  const [loadingTask, setLoadingTask] = useState<boolean>(true);
  const [taskError, setTaskError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  // -----------------------------
  // Load DTC task on mount
  // -----------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchDTCTask();
        if (cancelled) return;
        setTask(data);

        // If you ever add starterCode later, it'll pick it up here.
        const initialCode =
          (data as any).starterCode ||
          (data.prompt && (data.prompt as any).starterCode) ||
          "";
        setCode(initialCode);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load DTC task";
        setTaskError(msg);
      } finally {
        if (!cancelled) {
          setLoadingTask(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const language = task?.language || "cpp";
  const imageUrl = buildImageUrl(task);

  // -----------------------------
  // Lightweight feedback parsing
  // (Matches your marker’s shape)
  // -----------------------------
  const feedback = result?.feedback;

  const renderFeedbackSummary = (fb: any, res: any) => {
    if (!fb) return null;

    const missingClasses: string[] = fb.missingClasses || [];
    const extraClasses: string[] = fb.extraClasses || [];
    const missingRelationships: any[] = fb.missingRelationships || [];
    const extraRelationships: any[] = fb.extraRelationships || [];
    const methodFeedback = fb.methodFeedback || {};

    const scores = fb.scores || {};
    const classScore = scores.classScore ?? null;
    const relScore = scores.relScore ?? null;
    const methodScore = scores.methodScore ?? null;

    const totalScore = res?.score;
    const totalMaxScore = res?.maxScore;

    const hasAnyComponentScore =
      classScore != null || relScore != null || methodScore != null;

    return (
      <div style={{ fontSize: 13, lineHeight: 1.4 }}>
        {(hasAnyComponentScore ||
          (totalScore != null && totalMaxScore != null)) && (
          <div style={{ marginBottom: 8 }}>
            <strong>Breakdown:</strong>{" "}
            {[
              classScore != null && `Classes: ${classScore}`,
              relScore != null && `Relationships: ${relScore}`,
              methodScore != null && `Methods: ${methodScore}`,
              totalScore != null &&
                totalMaxScore != null &&
                `Total: ${totalScore}/${totalMaxScore}`,
            ]
              .filter(Boolean)
              .join(" • ")}
          </div>
        )}

        {missingClasses.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <strong>Missing classes:</strong> {missingClasses.join(", ")}
          </div>
        )}
        {extraClasses.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <strong>Extra classes:</strong> {extraClasses.join(", ")}
          </div>
        )}

        {missingRelationships.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <strong>Missing relationships:</strong>{" "}
            {missingRelationships
              .map(
                (r: any) =>
                  `${r.from ?? "?"} → ${r.to ?? "?"}${
                    r.type ? ` (${r.type})` : ""
                  }`
              )
              .join("; ")}
          </div>
        )}
        {extraRelationships.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <strong>Extra relationships:</strong>{" "}
            {extraRelationships
              .map(
                (r: any) =>
                  `${r.from ?? "?"} → ${r.to ?? "?"}${
                    r.type ? ` (${r.type})` : ""
                  }`
              )
              .join("; ")}
          </div>
        )}

        {methodFeedback && Object.keys(methodFeedback).length > 0 && (
          <div style={{ marginTop: 4 }}>
            <strong>Methods:</strong>
            <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
              {Object.entries(methodFeedback).map(
                ([className, mf]: [string, any]) => {
                  const missing = mf.missingMethods || [];
                  const extra = mf.extraMethods || [];
                  if (!missing.length && !extra.length) return null;
                  return (
                    <li key={className} style={{ marginBottom: 2 }}>
                      <span style={{ fontWeight: 500 }}>{className}:</span>{" "}
                      {[
                        missing.length > 0 && `missing ${missing.join(", ")}`,
                        extra.length > 0 && `extra ${extra.join(", ")}`,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </li>
                  );
                }
              )}
            </ul>
          </div>
        )}

        {missingClasses.length === 0 &&
          extraClasses.length === 0 &&
          missingRelationships.length === 0 &&
          extraRelationships.length === 0 &&
          (!methodFeedback || Object.keys(methodFeedback).length === 0) && (
            <div>No structural issues detected. 🎉</div>
          )}
      </div>
    );
  };

  // -----------------------------
  // Submit handler
  // -----------------------------
  const handleSubmit = async () => {
    setSubmitError(null);
    setResult(null);

    if (!code.trim()) {
      setSubmitError("Please write some C++ code before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      // TODO: plug in real user id
      const response = await submitDTC(code, "demo-user");
      setResult(response);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to submit DTC answer";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: 24,
        maxWidth: 1500,
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Header + copy + feedback box in top-right */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 24,
        }}
      >
        {/* Left: title + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: "1.75rem", marginBottom: 8 }}>
            UML – Diagram to Code
          </h1>
          <p style={{ marginBottom: 8, color: "#dcebffff" }}>
            Study the UML diagram and implement the corresponding C++ classes
            that realize the Factory Method design. Focus on matching the class
            hierarchy and key operations.
          </p>
          <ul style={{ paddingLeft: "1.2rem", color: "#dcebffff" }}>
            <li>🧱 Recreate the abstract and concrete classes.</li>
            <li>🧬 Ensure inheritance relationships match the diagram.</li>
            <li>🛠️ Implement the factory method and product behavior.</li>
          </ul>
        </div>

        {/* Right: feedback box */}
        <div
          style={{
            width: "32%",
            minWidth: 260,
            maxWidth: 360,
          }}
        >
          <div
            style={{
              backgroundColor: "#e5e5e5ff",
              color: "#000000",
              borderRadius: 8,
              padding: 12,
              border: "1px solid #d4d4d4",
              boxSizing: "border-box",
              maxHeight: 200,
              overflowX: "auto",
              overflowY: "auto",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Feedback</div>
            {feedback ? (
              renderFeedbackSummary(feedback, result)
            ) : (
              <div style={{ fontSize: 13, color: "#111827" }}>
                Submit your code to see detailed feedback here.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Task loading / error state */}
      {loadingTask && <div>Loading task…</div>}
      {taskError && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          {taskError}
        </div>
      )}

      {!loadingTask && !taskError && (
        <>
          {/* Image + Code editor HORIZONTAL layout (matching CTD section style) */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "30% 70%",
              gap: 24,
              alignItems: "stretch",
              height: "700px",
              maxHeight: "62vh",
            }}
          >
            {/* Image panel */}
            <div
              style={{
                minHeight: 260,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h2 style={{ fontSize: "1.1rem", marginBottom: 8 }}>
                UML Diagram
              </h2>
              <div
                style={{
                  flex: 1,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #111827",
                  minHeight: 320,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#111827",
                }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={task?.title || "UML diagram"}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      color: "#d1d5db",
                      fontSize: 14,
                    }}
                  >
                    No diagram image provided.
                  </span>
                )}
              </div>
            </div>

            {/* Code editor panel */}
            <div
              style={{
                minHeight: 320,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h2 style={{ fontSize: "1.1rem", marginBottom: 8 }}>C++ Code</h2>
              <div
                style={{
                  flex: 1,
                  minHeight: 320,
                }}
              >
                <CodeEditor code={code} onChange={setCode} />
              </div>
            </div>
          </section>

          {/* Submit + score + error */}
          <section
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  alignSelf: "flex-start",
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "none",
                  background: submitting ? "#9ca3af" : "#2563eb",
                  color: "#ffffff",
                  fontWeight: 500,
                  cursor: submitting ? "default" : "pointer",
                }}
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>

              {result && (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#e5e7eb",
                  }}
                >
                  Score: {result.score} / {result.maxScore}
                </span>
              )}
            </div>

            {submitError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "#fee2e2",
                  color: "#991b1b",
                  maxWidth: 600,
                }}
              >
                {submitError}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default DTC;
