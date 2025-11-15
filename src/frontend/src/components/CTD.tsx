import React, { useEffect, useRef, useState } from "react";
import CodeViewer from "./CodeViewer";
import ApollonUmlEditor, {
  type ApollonUmlEditorHandle,
} from "./ApollonUmlEditor";
import { fetchCTDTask, submitCTD } from "../pages/UML/helpers";

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
      {/* Header + copy */}
      <section>
        <h1 style={{ fontSize: "1.75rem", marginBottom: 8 }}>
          UML – Code to Diagram
        </h1>
        <p style={{ marginBottom: 8, color: "#dcebffff" }}>
          Read the C++ implementation and construct a UML class diagram that
          captures the Factory Method design. Focus on classes, inheritance, and
          key operations.
        </p>
        <ul style={{ paddingLeft: "1.2rem", color: "#dcebffff" }}>
          <li>🧱 Distinguish abstract vs concrete classes.</li>
          <li>🧬 Represent the inheritance structure accurately.</li>
          <li>🛠️ Include the core factory method and product behavior.</li>
        </ul>
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
          {/* Code + UML editor HORIZONTAL layout (20% / 80%) */}
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

          {/* Submit + feedback */}
          <section
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
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

            {result && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: "#f3f4f6",
                  maxWidth: 800,
                  fontSize: 14,
                }}
              >
                <div style={{ marginBottom: 4 }}>
                  <strong>
                    Score: {result.score} / {result.maxScore}
                  </strong>
                </div>
                {result.feedback && (
                  <pre
                    style={{
                      margin: 0,
                      marginTop: 8,
                      padding: 8,
                      borderRadius: 6,
                      background: "#e5e7eb",
                      overflowX: "auto",
                      fontSize: 12,
                    }}
                  >
                    {JSON.stringify(result.feedback, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default CTD;
