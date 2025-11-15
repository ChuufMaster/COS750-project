$BASE = $env:BASE
if (-not $BASE) { $BASE = "http://localhost:8000" }

Write-Host "[0] Ping API root"
irm "$BASE/" | ConvertTo-Json -Depth 10

Write-Host "`n[1] List MQs"
irm "$BASE/quiz/mqs" | ConvertTo-Json -Depth 10

Write-Host "`n[2] Fetch MQ1 (deterministic shuffle)"
irm "$BASE/quiz/mq/mq1?shuffle=true&seed=7" | ConvertTo-Json -Depth 10

Write-Host "`n[3] Submit MQ1 attempt"
$payload = @{
  session_id = "sess-123"
  mq_id = "mq1"
  attempt_number = 1
  attempts = @(
    @{ item_id="mq1_q1"; response="A"; time_ms=12000 },
    @{ item_id="mq1_q2"; response="Concrete"; time_ms=6000 },
    @{ item_id="mq1_q3"; response="B"; time_ms=9000 }
  )
}
$resp = irm -Method Post -Uri "$BASE/quiz/submit" -ContentType "application/json" -Body ($payload | ConvertTo-Json -Depth 10)
$resp | ConvertTo-Json -Depth 10

Write-Host "`n[4] Export analytics as CSV"
(Invoke-WebRequest "$BASE/quiz/analytics/attempts?format=csv").Content

Write-Host "`n[5] Next MQ helper"
irm "$BASE/quiz/next?last_mq_id=mq1" | ConvertTo-Json -Depth 10

# Optional AI checks
if ($env:GEMINI_API_KEY) {
  Write-Host "`n[6] /ai/generate (json_mode)"
  $gen = @{
    instruction = "Return a compact JSON greeting object with fields {`"greet`": string, `"course`": string}. No prose."
    parts = @(@{ text = "Say hello to COS214" })
    json_mode = $true
    temperature = 0.2
    top_p = 0.95
    max_output_tokens = 128
  }
  irm -Method Post -Uri "$BASE/ai/generate" -ContentType "application/json" -Body ($gen | ConvertTo-Json -Depth 10) | ConvertTo-Json -Depth 10

  Write-Host "`n[7] /ai/grade rubric check"
  $grade = @{
    rubric = "Award 1 point if the answer mentions using Creator::make() and returning Product* (or base Product). Otherwise 0."
    student_text = "Use Creator::make() and return a Product* to the caller so the client never news a concrete."
    max_points = 1
    request_json = $true
  }
  irm -Method Post -Uri "$BASE/ai/grade" -ContentType "application/json" -Body ($grade | ConvertTo-Json -Depth 10) | ConvertTo-Json -Depth 10
}
else {
  Write-Host "[AI] Skipping /ai/* tests (GEMINI_API_KEY not set)."
}

Write-Host "`n✓ All smoke checks done."