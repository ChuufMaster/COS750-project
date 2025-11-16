// helpers.ts
// Simple helpers for talking to the UML backend

const API_BASE_URL = "http://localhost:8000";

export async function fetchCTDTask() {
  const res = await fetch(`${API_BASE_URL}/uml/CTD`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch CTD task: ${res.status}`);
  }

  return res.json();
}

export async function fetchDTCTask() {
  const res = await fetch(`${API_BASE_URL}/uml/DTC`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch DTC task: ${res.status}`);
  }

  return res.json();
}

/**
 * Submit a Code-to-Diagram answer for marking.
 * - umlModel should be the Apollon JSON model from the editor
 * - userId is optional for now (we'll wire it into tracking later)
 */
export async function submitCTD(umlModel: any, userId?: string) {
  const payload: any = {
    uml: umlModel,
  };

  if (userId) {
    payload.userId = userId;
  }

  const res = await fetch(`${API_BASE_URL}/uml/SubmitCTD`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to submit CTD: ${res.status}`);
  }

  return res.json();
}

export async function submitDTC(code: string, userId: string) {
  const res = await fetch(`${API_BASE_URL}/uml/SubmitDTC`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      code,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to submit DTC: ${res.status} ${res.statusText} ${text}`
    );
  }

  return res.json();
}
