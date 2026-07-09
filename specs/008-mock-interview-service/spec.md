# Feature Specification: Mock Interview Service

**Feature Branch**: `feat/mock-interview-service`

**Created**: 2026-07-08

**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Start an Interview Session (Priority: P1)

A student selects a target role and difficulty level, and the system generates a set of 3–7
interview questions tailored to that role. The student can then proceed through the interview
one question at a time.

**Why this priority**: Everything else depends on a session existing with generated questions.
No other user story is testable without this working first.

**Independent Test**: POST `/mock-interview/sessions` with `{ targetRole: "Backend Developer", difficulty: "ENTRY" }`
and a valid JWT → receive 201 with a `sessionId`, `status: "IN_PROGRESS"`, and a non-empty
`questions` array where each question has `questionText`, `category`, and `orderIndex`.

**Acceptance Scenarios**:

1. **Given** an authenticated student, **When** they POST to `/mock-interview/sessions` with
   a valid `targetRole` and `difficulty`, **Then** the system returns 201 with a session containing
   3–7 questions, each with a `category` of TECHNICAL, BEHAVIORAL, or SITUATIONAL.

2. **Given** an authenticated student, **When** the Claude API is unavailable, **Then** the
   system returns 503 with `{ "error": "AI service unavailable, try again later" }`.

3. **Given** an authenticated student, **When** they POST with a blank `targetRole`, **Then**
   the system returns 400.

4. **Given** an authenticated student, **When** they POST with an invalid `difficulty` value
   (including wrong case such as `"entry"`), **Then** the system returns 400.

---

### User Story 2 - Submit an Answer (Priority: P1)

A student submits their answer to a specific question in an active session. Claude evaluates
the answer and returns a score (0–10) and feedback immediately.

**Why this priority**: Core interactive loop of the feature. Required alongside User Story 1
as a P1.

**Independent Test**: POST `/mock-interview/sessions/{sessionId}/questions/{questionId}/answer`
with `{ "answer": "I would use a RESTful approach..." }` → receive 200 with `score` (0–10)
and `feedback` (non-empty string).

**Acceptance Scenarios**:

1. **Given** an active session with unanswered questions, **When** the student submits an
   answer to a question, **Then** the system returns 200 with the updated question containing
   `score` (0–10) and `feedback`.

2. **Given** an active session, **When** the student submits a blank answer, **Then**
   the system returns 400.

3. **Given** an active session, **When** the student submits an answer to an already-answered
   question, **Then** the system returns 409 (Conflict).

4. **Given** a completed session, **When** the student tries to submit an answer, **Then**
   the system returns 409.

5. **Given** a sessionId that belongs to another user, **When** the student submits an answer,
   **Then** the system returns 404 (no ownership leakage).

---

### User Story 3 - Complete a Session (Priority: P1)

After answering all questions, the student requests a session summary. Claude evaluates the
overall performance and returns an overall score (0–100) and summary feedback.

**Why this priority**: Completes the interview loop and is the main value-delivery moment.

**Independent Test**: POST `/mock-interview/sessions/{sessionId}/complete` after all questions
are answered → receive 200 with `overallScore` (0–100) and `overallFeedback` (non-empty string),
and `status: "COMPLETED"`.

**Acceptance Scenarios**:

1. **Given** a session where all questions are answered, **When** the student POSTs to
   `/complete`, **Then** the system returns 200 with `overallScore`, `overallFeedback`,
   `status: "COMPLETED"`, and a `completedAt` timestamp.

2. **Given** a session where not all questions are answered, **When** the student POSTs to
   `/complete`, **Then** the system returns 422 with an error message.

3. **Given** an already-completed session, **When** the student POSTs to `/complete` again,
   **Then** the system returns 409.

---

### User Story 4 - View Session History (Priority: P2)

A student views a list of all their past mock interview sessions, and can open any completed
session to review all questions, their answers, individual scores, and overall feedback.

**Why this priority**: Depends on sessions being created (P1). Provides persistent value.

**Independent Test**: GET `/mock-interview/sessions` returns 200 with an array (possibly empty)
of session summaries ordered by most recent first.

**Acceptance Scenarios**:

1. **Given** a student with prior sessions, **When** they GET `/mock-interview/sessions`,
   **Then** the system returns 200 with a list ordered newest-first, each containing
   `sessionId`, `targetRole`, `difficulty`, `status`, `overallScore`, and `createdAt`.

2. **Given** a student with no sessions, **When** they GET `/mock-interview/sessions`,
   **Then** the system returns 200 with an empty array.

3. **Given** a student, **When** they GET `/mock-interview/sessions/{sessionId}`,
   **Then** the system returns 200 with the full session including all questions, answers,
   scores, and feedback.

4. **Given** a sessionId belonging to another user, **When** a student GETs it,
   **Then** the system returns 404.

---

### User Story 5 - Delete a Session (Priority: P2)

A student deletes a session they no longer want in their history.

**Independent Test**: DELETE `/mock-interview/sessions/{sessionId}` returns 204. Subsequent GET
returns 404.

**Acceptance Scenarios**:

1. **Given** a session owned by the student, **When** they DELETE it, **Then** the system
   returns 204 and all associated questions are cascade-deleted.

2. **Given** a sessionId belonging to another user, **When** a student tries to delete it,
   **Then** the system returns 404.

---

### Edge Cases

- What if all questions are answered but `/complete` is never called? Session remains IN_PROGRESS indefinitely (acceptable for v1 — no auto-expiry). Resume via `GET /sessions/{id}` (see FR-012).
- What if Claude returns zero questions? The system MUST NOT persist an empty session; reject with 503 (see FR-011). A non-empty result (1–7) is persisted as-is.
- What if the CV/role is very unusual? Claude should still produce generic questions; if it returns an unmapped category it is stored as OTHER.

## Requirements

### Functional Requirements

- **FR-001**: System MUST accept `{ targetRole: string, difficulty: ENTRY|MID|SENIOR }` and call Claude to generate 3–7 interview questions.
- **FR-002**: System MUST persist each session and its questions in the `mock_interview` PostgreSQL schema.
- **FR-003**: System MUST accept a text answer (non-blank, max 5000 chars) for a specific question, call Claude to evaluate it, and return `score` (0–10) and `feedback`.
- **FR-004**: System MUST prevent answering a question that has already been answered (409).
- **FR-005**: System MUST prevent completing a session where not all questions are answered (422).
- **FR-006**: System MUST call Claude to generate `overallScore` (0–100) and `overallFeedback` on `/complete`.
- **FR-007**: System MUST return session lists ordered by `createdAt DESC`.
- **FR-008**: System MUST return 404 for sessions not owned by the requesting user (no ownership leakage).
- **FR-009**: System MUST expose `GET /mock-interview/health` as a public endpoint.
- **FR-010**: All Claude responses MUST use the JSON-safety guard (find first `[` or `{` before parsing).
- **FR-011**: System MUST reject session creation with 503 if Claude returns zero questions (no empty session persisted).
- **FR-012**: System MUST support resuming an in-progress session via `GET /sessions/{id}`; the client resumes at the lowest-`orderIndex` question with a null `userAnswer`.
- **FR-013**: Question `category` MUST accept TECHNICAL, BEHAVIORAL, SITUATIONAL, or OTHER (OTHER is the fallback for any unmapped Claude category).

### Key Entities

- **InterviewSession**: fields: id (UUID), userId (UUID), targetRole, difficulty, status (IN_PROGRESS|COMPLETED), overallScore (nullable), overallFeedback (nullable), createdAt, completedAt (nullable)
- **InterviewQuestion**: fields: id (UUID), sessionId (FK), questionText, category (TECHNICAL|BEHAVIORAL|SITUATIONAL|OTHER), orderIndex, userAnswer (nullable), score (nullable, 0–10), feedback (nullable), answeredAt (nullable)

## Success Criteria

- **SC-001**: POST `/mock-interview/sessions` returns a session with questions within 30 seconds.
- **SC-002**: POST answer endpoint returns score + feedback within 20 seconds.
- **SC-003**: POST complete endpoint returns overall score + feedback within 30 seconds.
- **SC-004**: All endpoints are covered by controller-slice and service unit tests.
- **SC-005**: JaCoCo line coverage ≥ 70%.
- **SC-006**: Service starts cleanly via `docker-compose up mock-interview-service` with no migration errors.
- **SC-007**: Mobile app can complete a full interview session end-to-end.

## Assumptions

- JWT secret is shared across all services; mock-interview-service validates tokens locally.
- No file uploads — all input is JSON.
- The Claude API key is available as `ANTHROPIC_API_KEY` environment variable.
- Port 8005 is used (8001–8004 already taken).
- Tests use `@WebMvcTest` with mocked services; no running PostgreSQL required.
- No rate limiting or session quotas for v1.
