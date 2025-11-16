// GUIDE:
// CAn access session info from session storage or props
// handleproceed progresses the local state, only enable after state has progressed with no errors on API side
// insert here the quiz content and logic
// submit answers for grading and keep track of scores
// on final submission, send results to backend for storage and progress the stored state on the back end
import React from "react";

type QuizProps = {
  handleProceed: () => void;
};

const Quiz: React.FC<QuizProps> = ({ handleProceed }) => {
  return (
    <main
      className="full-width"
      style={{
        padding: "24px 0px",
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
            Factory Method - Quiz
          </h1>
          {/* enable when results are submitted */}
          <button
            type="button"
            onClick={handleProceed}
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
            Proceed ➜
          </button>
        </section>
      </header>
      {/* YOUR CONTENT HERE */}
      <div>Quiz Content and logic</div>
    </main>
  );
};
export default Quiz;
