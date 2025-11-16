import React, { useEffect, useState } from "react";
import LoginPanel from "../../components/quiz_pages/Login";
import MicroLesson1 from "../../components/quiz_pages/MicroLesson1";

const States = [
  "Login",
  "Microlesson1",
  "Quiz",
  "Microlesson2",
  "Uml",
  "Code",
  "Results",
];

const FM: React.FC = () => {
  const [currentState, setCurrentState] = useState("Login");

  useEffect(() => {
    const storedStudent = sessionStorage.getItem("student_id");
    const storedSession = sessionStorage.getItem("session_id");

    // TODO: if logged in restore state
  }, []);

  // handlers
  const handleLoggedIn = (info: { studentId: string; sessionId: string }) => {
    console.log("Logged in:", info);
    setCurrentState("MicroLesson1");
  };

  const handleProceed = () => {
    setCurrentState((prev) => {
      const idx = States.indexOf(prev);
      if (idx === -1) return prev;
      if (idx >= States.length - 1) return prev;
      return States[idx + 1];
    });
  };

  // rendering based on state
  if (currentState === "Microlesson1") {
    return <MicroLesson1 />;
  }

  if (currentState === "Quiz") {
    return <div>Quiz Component Placeholder</div>;
  }

  if (currentState === "Microlesson2") {
    return <div>Micro Lesson 2 Component Placeholder</div>;
  }

  if (currentState === "Uml") {
    return <div>UML Component Placeholder</div>;
  }

  if (currentState === "Code") {
    return <div>Code practical Component Placeholder</div>;
  }

  if (currentState === "Results") {
    return <div>Results Component Placeholder</div>;
  }

  return <LoginPanel onLoggedIn={handleLoggedIn} />;
};

export default FM;
