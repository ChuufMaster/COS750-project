import { loginStudent } from "./helpers/Login_helpers";
import React, { useState } from "react";

type LoginPanelProps = {
  onLoggedIn: (info: { studentId: string; sessionId: string }) => void;
};

const LoginPanel: React.FC<LoginPanelProps> = ({ onLoggedIn }) => {
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLoginClick = () => {
    try {
      setError(null);
      const info = loginStudent(studentId); // validateLogin is called inside
      onLoggedIn(info);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed.";
      setError(msg);
    }
  };

  return (
    <main className="semi-width">
      <section>Factory Method</section>

      <section>Learning Outcomes</section>

      <section>
        <div>Time estimations</div>
        <div>
          <input
            type="text"
            placeholder="Enter student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <button type="button" onClick={handleLoginClick}>
            Login
          </button>
        </div>

        {error && (
          <div style={{ marginTop: "0.5rem", color: "#f97373" }}>{error}</div>
        )}
      </section>
    </main>
  );
};

export default LoginPanel;
