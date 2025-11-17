// src/pages/LessonRunner.tsx
import React from "react";
import { Link, useParams } from "react-router-dom";
import MicroLesson1 from "../components/lessons/MicroLesson1";
import MicroLesson2 from "../components/lessons/MicroLesson2";

const LESSON_COMPONENTS: Record<string, React.ComponentType> = {
  lesson1: MicroLesson1,
  lesson2: MicroLesson2,
};

const LessonRunner: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const LessonComponent =
    lessonId && LESSON_COMPONENTS[lessonId]
      ? LESSON_COMPONENTS[lessonId]
      : null;

  if (!LessonComponent) {
    return (
      <main className="mq-page">
        <header className="mq-header">
          <div>
            <p className="mq-kicker">Factory Method · Micro-lessons</p>
            <h1 className="mq-title">Lesson not found</h1>
          </div>
          <p className="mq-subtitle">
            The requested lesson does not exist. Please return to the lesson
            library.
          </p>
          <div className="mq-header-actions">
            <Link to="/lessons" className="mq-link">
              ← Back to lessons
            </Link>
            <Link to="/" className="mq-link">
              ← Home
            </Link>
          </div>
        </header>
      </main>
    );
  }

  return (
    <>
      <header className="mq-header" style={{ paddingBottom: 0 }}>
        <div>
          <h1 className="mq-title">
            {lessonId === "lesson1" ? "Lesson 1" : "Lesson 2"}
          </h1>
        </div>
        <div className="mq-header-actions" style={{ gap: "12px" }}>
          <Link to="/lessons" className="mq-link">
            ← Back to lessons
          </Link>
        </div>
      </header>
      <LessonComponent />
    </>
  );
};

export default LessonRunner;
