import React, { useEffect, useRef, useState } from "react";
import CodeViewer from "./CodeViewer";
import ApollonUmlEditor, {
  type ApollonUmlEditorHandle,
} from "./ApollonUmlEditor";
import { fetchCTDTask, submitCTD } from "../pages/UML/helpers";

// TODO: fix response parsing

type CTDTask = {
  id?: string;
  title?: string;
  description?: string;
  language?: string;
  code?: string;
  prompt?: {
    code?: string;
    filename?: string;
  };
  [key: string]: any;
};

const CTD: React.FC = () => {
  const umlRef = useRef<ApollonUmlEditorHandle | null>(null);

  const [task, setTask] = useState<CTDTask | null>(null);
  const [loadingTask, setLoadingTask] = useState<boolean>(true);
  const [taskError, setTaskError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  // -----------------------------
  // Load CTD task on mount
  // -----------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchCTDTask();
        if (cancelled) return;
        setTask(data);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load CTD task";
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

  // -----------------------------
  // Derived code for the viewer
  // -----------------------------
  const codeSnippet: string =
    (task?.code as string) ||
    (task?.prompt?.code as string) ||
    (task as any)?.promptCode ||
    "";

  const language = task?.language || "cpp";

  // -----------------------------
  // Lightweight feedback parsing
  // -----------------------------
  const feedback = result?.feedback;

  const renderFeedbackSummary = (fb: any) => {
    if (!fb) return null;

    const missingClasses: string[] = fb.missingClasses || [];
    const extraClasses: string[] = fb.extraClasses || [];
    const missingRelationships: any[] = fb.missingRelationships || [];
    const extraRelationships: any[] = fb.extraRelationships || [];
    const methodFeedback = fb.methodFeedback || {};
    const scores = fb.scores || fb.scoreBreakdown || {};

    return (
      <div style={{ fontSize: 13, lineHeight: 1.4 }}>
        {/* Score breakdown if present */}
        {(scores.classScore ||
          scores.relScore ||
          scores.methodScore ||
          scores.maxScore) && (
          <div style={{ marginBottom: 8 }}>
            <strong>Breakdown:</strong>{" "}
            {[
              scores.classScore != null &&
                `Classes: ${scores.classScore}/${scores.maxScore ?? "?"}`,
              scores.relScore != null && `Rels: ${scores.relScore}`,
              scores.methodScore != null && `Methods: ${scores.methodScore}`,
            ]
              .filter(Boolean)
              .join(" • ")}
          </div>
        )}

        {/* Missing / extra classes */}
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

        {/* Relationship issues */}
        {missingRelationships.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <strong>Missing relationships:</strong>{" "}
            {missingRelationships
              .map((r: any) => `${r.from} → ${r.to} (${r.type})`)
              .join("; ")}
          </div>
        )}
        {extraRelationships.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <strong>Extra relationships:</strong>{" "}
            {extraRelationships
              .map((r: any) => `${r.from} → ${r.to} (${r.type})`)
              .join("; ")}
          </div>
        )}

        {/* Method-level feedback */}
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

        {/* If nothing to complain about */}
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

    const model = umlRef.current?.getModel();
    console.log("Apollon model from editor:", model);

    if (!model) {
      setSubmitError("Could not read UML model from editor.");
      return;
    }

    setSubmitting(true);
    try {
      // userId hard-coded for now; later you can pass the real user
      const response = await submitCTD(model, "demo-user");
      setResult(response);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to submit CTD answer";
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
        {/* Left: title + copy (unchanged content) */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: "1.75rem", marginBottom: 8 }}>
            UML – Code to Diagram
          </h1>
          <p style={{ marginBottom: 8, color: "#dcebffff" }}>
            Read the C++ implementation and construct a UML class diagram that
            captures the Factory Method design. Focus on classes, inheritance,
            and key operations.
          </p>
          <ul style={{ paddingLeft: "1.2rem", color: "#dcebffff" }}>
            <li>🧱 Distinguish abstract vs concrete classes.</li>
            <li>🧬 Represent the inheritance structure accurately.</li>
            <li>🛠️ Include the core factory method and product behavior.</li>
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
              renderFeedbackSummary(feedback)
            ) : (
              <div style={{ fontSize: 13, color: "#111827" }}>
                Submit your attempt to see detailed feedback here.
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
          {/* Code + UML editor HORIZONTAL layout (20% / 80%)
              ⬇️ KEEPING THIS SECTION'S STYLES EXACTLY AS-IS */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "30% 70%",
              gap: 24,
              alignItems: "stretch",
              height: "700px", // 👈 main control
              maxHeight: "62vh", // optional: responsive cap
            }}
          >
            {/* Code panel (20%) */}
            <div
              style={{
                minHeight: 260,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h2 style={{ fontSize: "1.1rem", marginBottom: 8 }}>
                C++ Implementation
              </h2>
              <div
                style={{
                  flex: 1,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #111827",
                  minHeight: 320,
                }}
              >
                <CodeViewer code={codeSnippet} language={language} />
              </div>
            </div>

            {/* UML editor (80%) */}
            <div
              style={{
                minHeight: 320,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h2 style={{ fontSize: "1.1rem", marginBottom: 8 }}>
                UML Class Diagram
              </h2>
              <div style={{ flex: 1, minHeight: 320 }}>
                <ApollonUmlEditor ref={umlRef} />
              </div>
            </div>
          </section>

          {/* Submit + score + error (no big JSON block anymore) */}
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

export default CTD;
