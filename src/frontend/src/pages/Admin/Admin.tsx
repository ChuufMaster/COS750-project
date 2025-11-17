// src/pages/Admin/Admin.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./Admin.css";

type AttemptRow = {
  ts: number;
  student_id: string;
  session_id: string;
  mq_id: string;
  item_id: string;
  lo_ids: number[];
  pass_fail: number; // 0 or 1
  attempts: number;
  time_ms: number;
  error_class: string | null;
  remedial_clicked: boolean;
  marks_awarded: number;
  marks_possible: number;
};

type LOStat = {
  loId: number;
  attempts: number;
  passCount: number;
  totalMarksAwarded: number;
  totalMarksPossible: number;
  errorCounts: Record<string, number>;
};

type LoBand = "band1" | "band2" | "band3" | "band4";

function getLoBand(loId: number): LoBand {
  if (loId <= 9) return "band1";      // LO 1–9
  if (loId <= 15) return "band2";     // LO 10–15
  if (loId <= 23) return "band3";     // LO 16–23
  return "band4";                     // LO 24
}

const Admin: React.FC = () => {
  const [data, setData] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await axios.get<AttemptRow[]>(
          "http://127.0.0.1:8000/quiz/analytics/attempts?format=json"
        );
        setData(resp.data || []);
      } catch (e) {
        console.error(e);
        setError(
          "Could not load analytics from the server. Try again after some attempts have been submitted."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ---- Derived aggregates ----
  const {
    loStats,
    distinctStudents,
    totalAttempts,
    overallPassRate,
    lastTimestamp,
  } = useMemo(() => {
    const loMap = new Map<number, LOStat>();
    const studentIds = new Set<string>();
    let total = 0;
    let pass = 0;
    let lastTs = 0;

    for (const row of data) {
      total += 1;
      if (row.pass_fail === 1) pass += 1;
      if (row.student_id && row.student_id.trim().length > 0) {
        studentIds.add(row.student_id.trim());
      }
      if (row.ts && row.ts > lastTs) lastTs = row.ts;

      for (const lo of row.lo_ids || []) {
        if (!loMap.has(lo)) {
          loMap.set(lo, {
            loId: lo,
            attempts: 0,
            passCount: 0,
            totalMarksAwarded: 0,
            totalMarksPossible: 0,
            errorCounts: {},
          });
        }
        const stat = loMap.get(lo)!;
        stat.attempts += 1;
        if (row.pass_fail === 1) stat.passCount += 1;
        stat.totalMarksAwarded += row.marks_awarded ?? 0;
        stat.totalMarksPossible += row.marks_possible ?? 0;

        if (row.pass_fail === 0 && row.error_class) {
          const key = row.error_class;
          stat.errorCounts[key] = (stat.errorCounts[key] || 0) + 1;
        }
      }
    }

    const loStatsArray = Array.from(loMap.values());
    const overallPass =
      total > 0 ? Math.round((pass / total) * 100) / 100 : 0;

    return {
      loStats: loStatsArray,
      distinctStudents: studentIds.size,
      totalAttempts: total,
      overallPassRate: overallPass,
      lastTimestamp: lastTs,
    };
  }, [data]);

  // Sort LOs by weakest pass rate first (for intervention)
  const sortedLoStats = useMemo(() => {
    return [...loStats].sort((a, b) => {
      const passRateA = a.attempts > 0 ? a.passCount / a.attempts : 1;
      const passRateB = b.attempts > 0 ? b.passCount / b.attempts : 1;
      return passRateA - passRateB;
    });
  }, [loStats]);

  const formattedLastUpdated =
    lastTimestamp > 0
      ? new Date(lastTimestamp).toLocaleString()
      : "No attempts yet";

  return (
    <main className="admin-page semi-width">
      <header className="admin-header">
        <div>
          <p className="admin-kicker">Lecturer / Admin view</p>
          <h1 className="admin-title">Factory Method analytics</h1>
          <p className="admin-subtitle">
            Item-level analytics aggregated per learning outcome to help you
            see which concepts need intervention.
          </p>
        </div>
        <div className="admin-header-right">
          <p className="admin-updated">
            Last updated: <span>{formattedLastUpdated}</span>
          </p>
          <Link to="/" className="admin-back-link">
            ← Back to home
          </Link>
        </div>
      </header>

      {loading && <p>Loading analytics…</p>}
      {error && <p className="admin-error">{error}</p>}

      {!loading && !error && data.length === 0 && (
        <section className="admin-empty">
          <p>
            No attempts have been recorded yet. Ask students to complete a
            micro-quiz to populate this view.
          </p>
        </section>
      )}

      {!loading && !error && data.length > 0 && (
        <>
          {/* Summary cards */}
          <section className="admin-summary-grid">
            <div className="admin-summary-card">
              <h2>Total item attempts</h2>
              <p className="admin-summary-number">{totalAttempts}</p>
              <p className="admin-summary-caption">
                Each row corresponds to one student answer for one question.
              </p>
            </div>
            <div className="admin-summary-card">
              <h2>Distinct students</h2>
              <p className="admin-summary-number">{distinctStudents}</p>
              <p className="admin-summary-caption">
                Based on student IDs submitted with attempts.
              </p>
            </div>
            <div className="admin-summary-card">
              <h2>Overall pass rate</h2>
              <p className="admin-summary-number">
                {Math.round(overallPassRate * 100)}%
              </p>
              <p className="admin-summary-caption">
                Percentage of item attempts receiving full marks.
              </p>
            </div>
          </section>

          {/* LO-level difficulty table */}
          <section className="admin-section">
            <header className="admin-section-header">
              <div>
                <h2>Learning outcome overview</h2>
                <p>
                  Sorted by weakest pass rate first. Use this to identify LOs
                  where students are struggling and might need targeted
                  micro-lessons or explanation.
                </p>
              </div>

              {/* Colour band legend */}
              <div className="admin-lo-band-legend">
                <span className="admin-lo-band-label">LO bands:</span>
                <span className="admin-lo-pill admin-lo-pill--band1">
                  LO 1–9
                </span>
                <span className="admin-lo-pill admin-lo-pill--band2">
                  LO 10–15
                </span>
                <span className="admin-lo-pill admin-lo-pill--band3">
                  LO 16–23
                </span>
                <span className="admin-lo-pill admin-lo-pill--band4">
                  LO 24
                </span>
              </div>
            </header>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>LO</th>
                    <th>Attempts</th>
                    <th>Pass rate</th>
                    <th>Avg marks</th>
                    <th>Most common error tag</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLoStats.map((lo) => {
                    const passRate =
                      lo.attempts > 0
                        ? (lo.passCount / lo.attempts) * 100
                        : 0;
                    const avgMarkRatio =
                      lo.totalMarksPossible > 0
                        ? (lo.totalMarksAwarded / lo.totalMarksPossible) *
                          100
                        : 0;

                    let topError = "—";
                    let topErrorCount = 0;
                    for (const [err, count] of Object.entries(
                      lo.errorCounts
                    )) {
                      if (count > topErrorCount) {
                        topErrorCount = count;
                        topError = err;
                      }
                    }

                    const band = getLoBand(lo.loId);

                    return (
                      <tr key={lo.loId}>
                        <td>
                          <span
                            className={`admin-lo-pill admin-lo-pill--${band}`}
                          >
                            LO {lo.loId}
                          </span>
                        </td>
                        <td>{lo.attempts}</td>
                        <td>
                          <div className="admin-bar-cell">
                            <div className="admin-bar-track">
                              <div
                                className="admin-bar-fill admin-bar-fill--pass"
                                style={{ width: `${passRate}%` }}
                              />
                            </div>
                            <span className="admin-bar-label">
                              {passRate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="admin-bar-cell">
                            <div className="admin-bar-track">
                              <div
                                className="admin-bar-fill"
                                style={{ width: `${avgMarkRatio}%` }}
                              />
                            </div>
                            <span className="admin-bar-label">
                              {avgMarkRatio.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="admin-error-cell">
                          {topError !== "—" ? (
                            <span className="admin-error-tag">
                              {topError}
                            </span>
                          ) : (
                            <span className="admin-error-tag admin-error-tag--none">
                              None / mostly correct
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent rows table */}
          <section className="admin-section">
            <header className="admin-section-header">
              <h2>Recent attempts (debug view)</h2>
              <p>
                A small sample of the latest analytics rows, useful for the SE
                report or to verify that student IDs and error tags are logged
                as expected.
              </p>
            </header>

            <div className="admin-table-wrapper admin-table-wrapper--compact">
              <table className="admin-table admin-table--compact">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Student</th>
                    <th>MQ</th>
                    <th>Item</th>
                    <th>LOs</th>
                    <th>Pass</th>
                    <th>Marks</th>
                    <th>Error tag</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data]
                    .sort((a, b) => b.ts - a.ts)
                    .slice(0, 20)
                    .map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          {new Date(row.ts).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td>{row.student_id || "—"}</td>
                        <td>{row.mq_id}</td>
                        <td>{row.item_id}</td>
                        <td>
                          {row.lo_ids && row.lo_ids.length > 0
                            ? row.lo_ids.join(", ")
                            : "—"}
                        </td>
                        <td>
                          {row.pass_fail === 1 ? (
                            <span className="admin-pass-pill">Pass</span>
                          ) : (
                            <span className="admin-fail-pill">Fail</span>
                          )}
                        </td>
                        <td>
                          {row.marks_awarded} / {row.marks_possible}
                        </td>
                        <td>{row.error_class || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
};

export default Admin;
