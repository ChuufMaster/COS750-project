// ./helpers.ts

//Mock state API

// Login
function generateSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as any).randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function validateLogin(studentId: string): void {
  console.log(studentId);
  // TODO: implement real validation logic (e.g., backend check)
}

export function loginStudent(studentId: string): {
  studentId: string;
  sessionId: string;
} {
  const trimmed = studentId.trim();
  if (!trimmed) {
    throw new Error("Student ID cannot be empty.");
  }
  validateLogin(trimmed);
  const maxAgeSeconds = 60 * 60 * 24 * 7; // 7 days
  document.cookie = `student_id=${encodeURIComponent(
    trimmed,
  )}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;

  let sessionId = sessionStorage.getItem("session_id");
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem("session_id", sessionId);
  }

  sessionStorage.setItem("student_id", trimmed);
  return { studentId: trimmed, sessionId };
}
