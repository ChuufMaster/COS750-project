// src/pages/Quiz/Quiz.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

type MQMeta = {
  id: string;
  title: string;
  desc: string;
  total_marks: number;
  target_los: number[];
};

const Quiz: React.FC = () => {
  const [mqs, setMqs] = useState<MQMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await axios.get<MQMeta[]>(
          "http://127.0.0.1:8000/quiz/mqs"
        );
        // backend already returns mq1..mq6 sorted by id, but be safe:
        const sorted = [...resp.data].sort((a, b) => a.id.localeCompare(b.id));
        setMqs(sorted);
      } catch (e: any) {
        console.error(e);
        setError("Could not load micro-quizzes from the server.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <main className="mq-page">
      <header className="mq-header">
        <div>
          <p className="mq-kicker">Factory Method · Formative practice</p>
          <h1 className="mq-title">Micro-Quizzes</h1>
        </div>
        <p className="mq-subtitle">
          Each micro-quiz focuses on a small cluster of learning outcomes from
          the ID document. You can attempt them in any order; your first graded
          attempt is what matters for analytics, but you are free to retry.
        </p>
        <div className="mq-header-actions">
          <Link to="/" className="mq-link">
            ← Back to home
          </Link>
        </div>
      </header>

      {loading && <p>Loading micro-quizzes…</p>}
      {error && <p className="mq-error">{error}</p>}

      {!loading && !error && (
        <section className="mq-grid">
          {mqs.map((mq) => (
            <article key={mq.id} className="mq-card">
              <header className="mq-card-header">
                <h2 className="mq-card-title">{mq.title}</h2>
                <p className="mq-card-id">{mq.id.toUpperCase()}</p>
              </header>
              <p className="mq-card-desc">{mq.desc}</p>

              <dl className="mq-card-meta">
                <div>
                  <dt>Total marks</dt>
                  <dd>{mq.total_marks}</dd>
                </div>
                <div>
                  <dt>Target LOs</dt>
                  <dd>{mq.target_los.join(", ")}</dd>
                </div>
              </dl>

              <footer className="mq-card-footer">
                <Link to={`/quiz/${mq.id}`} className="mq-primary-button">
                  Start {mq.id.toUpperCase()}
                </Link>
              </footer>
            </article>
          ))}
        </section>
      )}
    </main>
  );
};

export default Quiz;
