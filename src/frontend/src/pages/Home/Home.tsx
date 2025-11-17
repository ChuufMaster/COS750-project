// src/pages/Home/Home.tsx
import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const Home: React.FC = () => {
  return (
    <main className="home full-width">
      {/* Hero / heading */}
      <header className="home-hero">
        <p className="home-badge">COS 214 prototype</p>
        <h1 className="home-title">COS 214 Practice Lab</h1>
        <p className="home-subtitle">
          A guided learning and practice environment for the Factory Method and related design-pattern
          skills in COS 214.
        </p>
      </header>

      {/* Main layout: student flow on the left, admin/help on the right */}
      <section className="home-grid semi-width">
        {/* Student side */}
        <div className="home-column">
          <h2 className="home-section-title">Student activities</h2>

          <div className="home-card-list">
            <Link
              to="/factorymethod"
              className="home-card home-card--primary"
            >
              <h3 className="home-card-title">Factory Method walk-through</h3>
              <p className="home-card-text">
                Follow the recommended sequence: short micro-lessons, quiz,
                UML activity and code refactor. Designed as the main student flow.
              </p>
              <span className="home-card-cta">Start guided practice →</span>
            </Link>

            <Link to="/quiz" className="home-card">
              <h3 className="home-card-title">Quick micro-quiz</h3>
              <p className="home-card-text">
                Answer a short Factory Method quiz and receive AI feedback on
                open-ended answers.
              </p>
            </Link>

            <Link to="/uml" className="home-card">
              <h3 className="home-card-title">UML workspace</h3>
              <p className="home-card-text">
                Work with Factory Method UML diagrams: build or inspect diagrams
                and check whether the pattern is present.
              </p>
            </Link>

            <Link to="/playground" className="home-card">
              <h3 className="home-card-title">Code playground</h3>
              <p className="home-card-text">
                Experiment with the C++ skeleton code used in the lessons and
                see how the Factory Method roles map to code.
              </p>
            </Link>
          </div>
        </div>

        {/* Admin / explanation side */}
        <aside className="home-column home-column--side">
          <h2 className="home-section-title">Lecturer / admin</h2>

          <Link to="/admin" className="home-card home-card--admin">
            <h3 className="home-card-title">Admin panel</h3>
            <p className="home-card-text">
              View attempt analytics, export CSV, and test micro-quizzes as an
              instructor.
            </p>
            <span className="home-card-cta">Open admin →</span>
          </Link>

          <div className="home-note">
            <h3 className="home-note-title">How this prototype fits together</h3>
            <ol className="home-note-list">
              <li>Select the Factory Method walk-through or a single activity.</li>
              <li>
                Students complete micro-lessons, quiz, UML and code activities in
                the browser.
              </li>
              <li>
                The admin panel exposes item-level analytics (JSON/CSV) for later
                SE/ID evaluation.
              </li>
            </ol>
          </div>
        </aside>
      </section>
    </main>
  );
};

export default Home;