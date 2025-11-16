$BASE = $env:BASE
if (-not $BASE) { $BASE = "http://localhost:8000" }

# Paths must match your backend defaults / env vars
$jsonPath = $env:QUIZ_ANALYTICS_JSONL
if (-not $jsonPath) { $jsonPath = "data/quiz_analytics.jsonl" }
$csvPath = $env:QUIZ_ANALYTICS_CSV
if (-not $csvPath) { $csvPath = "data/quiz_analytics.csv" }

Write-Host "[0] Ping API root"
irm "$BASE/" | ConvertTo-Json -Depth 10

Write-Host "`n[1] List MQs"
irm "$BASE/quiz/mqs" | ConvertTo-Json -Depth 10

Write-Host "`n[2] Fetch MQ1 (deterministic shuffle)"
irm "$BASE/quiz/mq/mq1?shuffle=true&seed=7" | ConvertTo-Json -Depth 10

Write-Host "`n[3] Submit MQ1 attempt (includes non-MCQ items + student_id)"
$payload = @{
  student_id    = "test-student-001"   # <- student number / username
  session_id    = "sess-123"
  mq_id         = "mq1"
  attempt_number = 1
  attempts      = @(
    # mq1_q1: MCQ (baseline deterministic marking)
    @{ item_id = "mq1_q1"; response = "A"; time_ms = 12000 },
    # mq1_q2: short_text → should go via Gemini grading path
    @{ item_id = "mq1_q2"; response = "Because the client should depend only on Creator and Product abstractions, not concretes."; time_ms = 8000 },
    # mq1_q4: fitb → also Gemini-graded (or exact-match fallback)
    @{ item_id = "mq1_q4"; response = "product object"; time_ms = 5000 }
  )
}
$resp = irm -Method Post -Uri "$BASE/quiz/submit" -ContentType "application/json" -Body ($payload | ConvertTo-Json -Depth 10)
$resp | ConvertTo-Json -Depth 10

Write-Host "`n[3b] Non-MCQ feedback from MQ1 (Gemini path check)"
# Show only items that actually have feedback
$resp.results |
  Where-Object { $_.feedback } |
  Select-Object item_id, marks_awarded, feedback |
  Format-List

Write-Host "`n[4] Persistent storage check (JSONL + CSV)"
Write-Host "JSONL path: $jsonPath"
Write-Host "CSV   path: $csvPath"

if (Test-Path $jsonPath) {
  Write-Host "`n[4a] JSONL exists, last 3 lines:"
  Get-Content -Path $jsonPath | Select-Object -Last 3
} else {
  Write-Host "[WARN] JSONL file not found at $jsonPath"
}

if (Test-Path $csvPath) {
  Write-Host "`n[4b] CSV exists, last 3 lines:"
  Get-Content -Path $csvPath | Select-Object -Last 3
} else {
  Write-Host "[WARN] CSV file not found at $csvPath"
}

Write-Host "`n[5] Export analytics as CSV via API"
(Invoke-WebRequest "$BASE/quiz/analytics/attempts?format=csv").Content

Write-Host "`n[6] Next MQ helper"
irm "$BASE/quiz/next?last_mq_id=mq1" | ConvertTo-Json -Depth 10

Write-Host "All smoke checks done."