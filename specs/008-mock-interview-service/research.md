# Research: Mock Interview Service

**Feature**: `008-mock-interview-service`
**Date**: 2026-07-08

---

## Decision 1 — Interview flow: one-by-one vs all-at-once

**Decision**: Questions are presented one at a time. The student submits each answer individually via `POST /mock-interview/sessions/{sessionId}/questions/{questionId}/answer`. Claude evaluates each answer immediately and returns `score` (0–10) and `feedback` before the student sees the next question.

**Rationale**: Simulates a real interview — the interviewer responds after each answer, not at the end. Per-answer feedback gives the student a feedback loop mid-session that keeps them engaged and aware of their performance trajectory. The all-at-once alternative delivers all feedback only after every question is answered, collapsing the interview into a form with no momentum.

**Alternatives considered**: All-at-once (collect all answers, submit once, one Claude call for all scores) — simpler backend but poor UX; degrades the interview to a form-filling exercise. Rejected.

---

## Decision 2 — Session completion: explicit `/complete` call vs auto-complete on last answer

**Decision**: Session completion is a deliberate, separate `POST /mock-interview/sessions/{sessionId}/complete` endpoint. Never triggered automatically when the last answer is submitted.

**Rationale**: Submitting the last answer takes ~5–7 s for Claude to evaluate it. Auto-completing on that same request would chain a second Claude call (for the overall summary), compounding total latency to 10–14 s in a single HTTP interaction. Splitting into two interactions keeps each step snappy. It also gives the student a deliberate "Complete Interview" action, matching the psychological close of a real interview.

**Alternatives considered**: Auto-complete triggered on the N-th answer — saves one round-trip but compounds Claude latency at the most emotionally significant moment of the session. Rejected.

---

## Decision 3 — Question count: Claude decides (3–7) vs fixed count

**Decision**: Claude decides how many questions to generate (3–7), guided by the `MOCK_INTERVIEW_QUESTIONS_V1` prompt. No floor or ceiling enforced server-side; whatever Claude returns is persisted.

**Rationale**: Matches the skill-gap-service pattern (Claude decides 3–7 gaps). Role complexity varies significantly — "Frontend Developer" does not need the same breadth as "Senior ML Engineer". A fixed count produces uniform sessions regardless of role depth, which is inaccurate.

**Alternatives considered**: Fixed count of 5 — deterministic and trivially checkable ("all answered" guard becomes `count == 5`), but over-questions junior candidates and under-covers senior roles. Rejected.

---

## Decision 4 — Prompt structure: three named constants vs one combined prompt

**Decision**: Three separate named prompt constants:
- `MOCK_INTERVIEW_QUESTIONS_V1` — generates question set for `targetRole` + `difficulty`; expects JSON array of `{ questionText, category, orderIndex }`.
- `MOCK_INTERVIEW_ANSWER_V1` — evaluates one answer in context; expects JSON object `{ "score": 0–10, "feedback": "..." }`.
- `MOCK_INTERVIEW_SUMMARY_V1` — generates overall session summary; expects JSON object `{ "overallScore": 0–100, "overallFeedback": "..." }`.

**Rationale**: Constitution III requires named prompt constants — no inline strings. Separate prompts are independently versioned and testable. Tuning answer evaluation does not risk regressing question generation.

**Alternatives considered**: One combined prompt with a `mode` discriminator — collapses three distinct AI tasks into one opaque string, violates prompt integrity principle, harder to tune independently. Rejected.

---

## Decision 5 — Session ownership enforcement: 404 vs 403

**Decision**: When a session belongs to a different user, return `404 Not Found`. No `403 Forbidden` for ownership failure.

**Rationale**: Consistent with the platform-wide pattern. `findByIdAndUserId` returns empty → `SessionNotFoundException` → 404. Returning 403 reveals that a resource with that ID exists, leaking existence to an unauthorized caller. 404 treats ownership as part of existence from the caller's perspective.

**Alternatives considered**: Return 403 — semantically clearer but leaks session existence. Rejected; consistent with skill-gap-service and portfolio-service.

---

## Decision 6 — Frontend state management: router params + API fetch vs in-memory bridge

**Decision**: Pass `sessionId` (and `questionId` where needed) as Expo Router params between screens. Each screen fetches its own data from the API on mount.

**Rationale**: The in-memory module state pattern (`extraction-state.ts` in portfolio) does not survive app backgrounding — if the OS suspends the app mid-interview, the module-level state is cleared. Interview session data is fully persisted server-side, so re-fetching on screen mount is cheap, reliable, and always consistent with the database truth.

**Alternatives considered**: In-memory state bridge — fragile across navigation stack pops/pushes and app lifecycle suspend/resume. Rejected.
