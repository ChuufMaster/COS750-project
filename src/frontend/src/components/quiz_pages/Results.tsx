// GUIDE:
// CAn access session info from session storage or props
// handleproceed progresses the local state, only enable after state has progressed with no errors on API side
// insert here the quiz content and logic
// submit answers for grading and keep track of scores
// on final submission, send results to backend for storage and progress the stored state on the back end
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProgressAndResults } from "./helpers/Mock_results_api";

type ResultsProps = {
  studentId: string;
};

const Results: React.FC<ResultsProps> = ({ studentId }) => {
  const navigate = useNavigate();
  const [resultsSnapshot, setResultsSnapshot] = React.useState<Record<
    string,
    unknown
  > | null>(null);

  useEffect(() => {
    const snapshot = getProgressAndResults(studentId);
    setResultsSnapshot(snapshot);
  }, [studentId]);

  return (
    <main
      className="full-width"
      style={{
        padding: "24px 0",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "center",
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "#242424",
          padding: "16px 0",
          borderBottom: "2px solid #333",
        }}
      >
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            maxWidth: "1200px",
            minWidth: "1200px",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
            🏭 Factory Method -Your Results
          </h1>
          {/* enable when results are submitted */}
          <div>
            <button
              type="button"
              onClick={() => {
                navigate("/");
              }}
              style={{
                padding: "8px 36px",
                borderRadius: 999,
                marginRight: "12px",
                border: "none",
                background: "#eb254dff",
                color: "#ffffff",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Exit ➜
            </button>
            <button
              type="button"
              onClick={() => {}}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try Again ➜
            </button>
          </div>
        </section>
      </header>
      <div>Results Content and logic</div>
      <div>
        <h2>Debug: Progress & Results</h2>
        {resultsSnapshot ? (
          <pre
            style={{
              background: "#111",
              padding: "12px",
              borderRadius: "8px",
              maxHeight: "300px",
              overflow: "auto",
              fontSize: "0.85rem",
            }}
          >
            {JSON.stringify(resultsSnapshot, null, 2)}
          </pre>
        ) : (
          <p>Error.</p>
        )}
      </div>
    </main>
  );
};
export default Results;
