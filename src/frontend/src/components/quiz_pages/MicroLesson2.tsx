import React from "react";

type MicroLesson2Props = {
  handleProceed: () => void;
};

const MicroLesson2: React.FC<MicroLesson2Props> = ({ handleProceed }) => {
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
            Factory Method - Lesson 2
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
      {/* Main lesson content */}
      <section
        style={{
          borderRadius: 12,
          border: "1px solid #1f2937",
          padding: "16px",
        }}
      >
        <p style={{ marginBottom: 8 }}>
          Micro Lesson 2 Content goes here. You can add explanations, examples,
          and diagrams about the Factory Method pattern (or whatever topic this
          lesson covers).
        </p>
        <ul style={{ paddingLeft: "1.2rem" }}>
          <li>Key idea 1</li>
          <li>Key idea 2</li>
          <li>Key idea 3</li>
        </ul>
      </section>
    </main>
  );
};
export default MicroLesson2;
