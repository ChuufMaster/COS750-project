// src/pages/Lessons.tsx
import React from "react";
import { Link } from "react-router-dom";

type LessonCard = {
  id: string;
  title: string;
  desc: string;
  path: string;
};

const LESSONS: LessonCard[] = [
  {
    id: "L1",
    title: "Lesson 1 · FM Theory Refresher",
    desc:
      "Revisit the intent, roles, and motivation behind the Factory Method pattern with guided prompts.",
    path: "/lessons/lesson1",
  },
  {
    id: "L2",
    title: "Lesson 2 · FM Code Walkthrough",
    desc:
      "Dive deeper into the code cues and lifecycle considerations with richer C++ snippets.",
    path: "/lessons/lesson2",
  },
];

const Lessons: React.FC = () => {
  return (
    <main className="mq-page">
      <header className="mq-header">
        <div>
          <p className="mq-kicker">Factory Method · Micro-lessons</p>
          <h1 className="mq-title">Lesson Library</h1>
        </div>
        <p className="mq-subtitle">
          Jump straight into the short lessons that accompany the guided
          walkthrough. Use these cards to review Lesson 1 or Lesson 2 whenever
          you need a refresher.
        </p>
        <div className="mq-header-actions">
          <Link to="/" className="mq-link">
            ← Back to home
          </Link>
        </div>
      </header>

      <section className="mq-grid">
        {LESSONS.map((lesson) => (
          <article key={lesson.id} className="mq-card">
            <header className="mq-card-header">
              <h2 className="mq-card-title">{lesson.title}</h2>
              <p className="mq-card-id">{lesson.id}</p>
            </header>
            <p className="mq-card-desc">{lesson.desc}</p>
            <footer className="mq-card-footer">
              <Link to={lesson.path} className="mq-primary-button">
                Open {lesson.id}
              </Link>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
};

export default Lessons;
