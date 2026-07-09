# Quickstart: Mock Interview Service

Validation guide to prove the feature works end-to-end. See `contracts/mock-interview-api.md` for full request/response shapes and `data-model.md` for schema.

## 1. Prerequisites

- Docker + Docker Compose running
- `.env` populated: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANTHROPIC_API_KEY`
- Expo app dependencies installed (`cd frontend && npm install`)

## 2. Start the service

```bash
docker-compose up mock-interview-service --build
```
Confirm Flyway runs migrations V1–V3 and the app starts on port 8005 with no errors.

## 3. Verify health

```bash
curl http://localhost:8080/mock-interview/health
# → 200 {"status":"UP"}
```

## 4. Backend happy path

Get a JWT first:
```bash
# register (once) then login
curl -X POST http://localhost:8080/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"test@skillbridge.io","password":"Passw0rd!","firstName":"Test","lastName":"User"}'
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"test@skillbridge.io","password":"Passw0rd!"}' | jq -r .accessToken)
```

1. **Start a session**
   ```bash
   curl -X POST http://localhost:8080/mock-interview/sessions \
     -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
     -d '{"targetRole":"Backend Developer","difficulty":"ENTRY"}'
   ```
   → 201, `questions` array has 3–7 items, each with `questionText`, `category`, `orderIndex`.

2. **Submit an answer** (use a `sessionId` and `questionId` from step 1)
   ```bash
   curl -X POST "http://localhost:8080/mock-interview/sessions/$SID/questions/$QID/answer" \
     -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
     -d '{"answer":"REST is resource-oriented and stateless..."}'
   ```
   → 200 with `score` (0–10) and `feedback`.

3. **Repeat** for every question in the session.

4. **Complete the session**
   ```bash
   curl -X POST "http://localhost:8080/mock-interview/sessions/$SID/complete" \
     -H "Authorization: Bearer $TOKEN"
   ```
   → 200 with `overallScore` (0–100), `overallFeedback`, `status: "COMPLETED"`, `completedAt`.

5. **List sessions**
   ```bash
   curl http://localhost:8080/mock-interview/sessions -H "Authorization: Bearer $TOKEN"
   ```
   → 200 array containing the completed session (newest first).

6. **Delete the session**
   ```bash
   curl -X DELETE "http://localhost:8080/mock-interview/sessions/$SID" -H "Authorization: Bearer $TOKEN"
   ```
   → 204. Subsequent GET → 404.

## 5. Error cases

| Action | Expected |
|---|---|
| POST /sessions with blank `targetRole` | 400 |
| POST /sessions with `difficulty: "EXPERT"` | 400 |
| Answer an already-answered question | 409 |
| POST /complete before all questions answered | 422 |
| POST /complete on a COMPLETED session | 409 |
| GET/DELETE a session owned by another user | 404 |
| Any protected endpoint without JWT | 401 |

## 6. Frontend scenario

1. Launch the Expo app, log in.
2. Home screen → tap **Interview** quick link (or the Interview tab).
3. Tap **Start Interview**, enter a role, pick a difficulty → session starts.
4. Answer each question one at a time; confirm score + feedback appear after each submission.
5. On the last question, tap **See Results** / **Complete Interview** → results screen shows overall score + summary.
6. Tap **Done** → returns to history; the session appears in the list.
7. Tap the history entry → full session detail (questions, answers, per-question scores, overall feedback).

## 7. Run tests

```bash
cd backend/mock-interview-service
./mvnw test
```
All unit + controller-slice tests pass; JaCoCo line coverage ≥ 70%.
