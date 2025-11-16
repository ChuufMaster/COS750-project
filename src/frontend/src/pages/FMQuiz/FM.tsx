import React, { useEffect, useState } from "react";
import LoginPanel from "../../components/quiz_pages/Login";
import MicroLesson1 from "../../components/quiz_pages/MicroLesson1";
import Quiz from "../../components/quiz_pages/Quiz";
import MicroLesson2 from "../../components/quiz_pages/MicroLesson2";
import Uml from "../../components/quiz_pages/Uml";
import Results from "../../components/quiz_pages/Results";
import Code from "../../components/quiz_pages/Code";
import {
  getCurrentState,
  initAttempt,
} from "../../components/quiz_pages/helpers/Mock_results_api";

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
  const [sessionInfo, setSessionInfo] = useState<{
    studentId: string;
    sessionId: string;
  } | null>(null);

  useEffect(() => {
    const storedStudent = sessionStorage.getItem("student_id");
    const storedSession = sessionStorage.getItem("session_id");
    if (storedStudent && storedSession) {
      setSessionInfo({
        studentId: storedStudent,
        sessionId: storedSession,
      });
      const state = getCurrentState(storedStudent);
      if (state) setCurrentState(state);
    }
  }, []);

  // handlers
  const handleLoggedIn = (info: { studentId: string; sessionId: string }) => {
    setSessionInfo({
      studentId: info.studentId,
      sessionId: info.sessionId,
    });
    console.log("Logged in:", info);
    initAttempt(info.studentId);
    handleProceed();
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
  if (sessionInfo === null) {
    return <LoginPanel onLoggedIn={handleLoggedIn} />;
  }

  if (currentState === "Microlesson1") {
    return (
      <MicroLesson1
        handleProceed={handleProceed}
        studentId={sessionInfo.studentId}
      />
    );
  }

  if (currentState === "Quiz") {
    return (
      <Quiz handleProceed={handleProceed} studentId={sessionInfo.studentId} />
    );
  }

  if (currentState === "Microlesson2") {
    return (
      <MicroLesson2
        handleProceed={handleProceed}
        studentId={sessionInfo.studentId}
      />
    );
  }

  if (currentState === "Uml") {
    return (
      <Uml handleProceed={handleProceed} studentId={sessionInfo.studentId} />
    );
  }

  if (currentState === "Code") {
    return (
      <Code handleProceed={handleProceed} studentId={sessionInfo.studentId} />
    );
  }

  if (currentState === "Results") {
    return <Results studentId={sessionInfo.studentId} />;
  }
};

export default FM;
