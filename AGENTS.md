# AGENTS.md — kweez

## Project Overview

**kweez** is a self-hosted, real-time quiz web application inspired by Kahoot!, designed for live events such as parties.

Participants join using a QR code, enter their name, and answer timed questions in sync. The administrator controls quiz flow in real time.

The system is optimized for:
- Small to medium groups (10–50 concurrent users)
- Low latency (real-time synchronization)
- Simple deployment (Docker-based, self-hosted)

---

## Core Concepts

### Roles

- **Player**
  - Joins via QR code
  - Enters name
  - Answers questions
  - Sees score and rankings

- **Administrator**
  - Creates and manages quizzes
  - Starts/stops quiz sessions
  - Releases questions
  - Controls progression

---

## Architecture Overview

### High-Level Stack

- **Frontend**
  - React + TypeScript
  - MUI (Material UI) with Material Design 3-inspired theming

- **Backend**
  - ASP.NET Core (.NET 10)
  - SignalR for real-time communication

- **Database**
  - PostgreSQL

- **Infrastructure**
  - Docker + Docker Compose
  - Reverse proxy (shared with Nextcloud, e.g., Caddy or Nginx)

---

## System Components

### 1. Frontend (React)

Two main application modes:

- **Player UI**
- **Admin UI**

Routing example:

/join           → enter name  
/wait           → waiting lobby  
/play           → active question  
/results        → interim results  
/final          → final leaderboard  

/admin          → dashboard  
/admin/quiz     → CRUD quizzes  
/admin/live     → control active session  

---

### 2. Backend (ASP.NET Core)

#### Responsibilities

- REST API for:
  - Quiz CRUD
  - Session management
  - Admin actions

- SignalR Hub for:
  - Real-time question broadcast
  - Timer synchronization
  - Answer submission
  - Score updates
  - Leaderboard updates

---

### 3. Real-Time Layer (SignalR)

**SignalR is the core of the system.**

Events include:

- PlayerJoined
- QuestionReleased
- AnswerSubmitted
- QuestionClosed
- ShowResults
- LeaderboardUpdated
- QuizEnded

All timing must be **server-authoritative**.

---

### 4. Database (PostgreSQL)

Suggested schema:

- quizzes
- questions
- answer_options
- quiz_sessions
- participants
- participant_answers
- score_snapshots

---

## Game Flow

1. Player scans QR code → opens `/join`
2. Player enters name → joins session
3. Player waits in lobby
4. Admin starts quiz
5. For each question:
   - Admin releases question
   - Server sets `released_at_utc`
   - Question broadcast via SignalR
   - Players answer within 15 seconds
   - Server closes question automatically
   - Results + leaderboard displayed
6. After last question:
   - Final leaderboard shown

---

## Scoring Rules

score = max(0, 1000 - elapsed_ms * 0.06)


Where:
- `elapsed_ms` = server time difference between:
  - question release
  - answer submission

Rules:
- Only correct answers score points
- All scoring happens on the server
- Client timestamps must never be trusted

---

## Key Technical Principles

### 1. Server Authority

- All timing is controlled by the backend
- Clients are “dumb displays”
- Prevents cheating and inconsistencies

---

### 2. Real-Time First

- SignalR is not optional
- Do not poll for updates
- All state transitions are event-driven

---

### 3. Stateless Frontend

- Frontend should not hold critical game state
- Reconnect must be supported:
  - Player identity stored in localStorage
  - Session restored on reconnect

---

### 4. Simplicity Over Features

This is an event app, not a SaaS platform.

Avoid:
- Authentication systems
- Multi-tenancy
- Complex permissions
- Over-engineering

---

## Frontend Guidelines

### UI Framework

Use:
- MUI (Material UI)

Design style:
- Follow Material Design 3 principles (color, spacing, shapes)
- Do not attempt full MD3 compliance

---

### UX Requirements

- Mobile-first design
- Large tap targets
- Minimal text input
- Clear feedback (correct/wrong answers)
- Smooth transitions between states

---

### Important Screens

- Join screen
- Waiting lobby
- Question screen (4 large buttons)
- Results screen
- Leaderboard screen

---

## Backend Guidelines

### API Design

- REST for admin/data operations
- SignalR for live gameplay

### Example Controllers

- QuizController
- SessionController
- AdminController

### SignalR Hub

- QuizHub

---

### Concurrency Considerations

- Multiple players answering simultaneously
- Use efficient inserts (batching if needed)
- Avoid locking where possible

---

## Deployment

### Docker Services

- frontend
- backend
- postgres
- reverse-proxy

### Requirements

- Single machine (home server)
- HTTPS enabled (via reverse proxy)
- Accessible via local network or internet

---

## QR Code Entry

Players join via QR code pointing to:

https://your-domain/join?session=<sessionId>

Notes:
- Do NOT use barcodes
- QR code must be easily scannable from distance

---

## Non-Goals (Important)

This project intentionally does NOT include:

- User accounts
- Persistent player profiles
- Public quiz sharing
- Payments or monetization
- Complex analytics

---

## Future Enhancements (Optional)

- Images in questions
- Sound effects
- Animated leaderboard
- Team mode
- Export/import quizzes

---

## Coding Conventions

### Backend

- Use async/await everywhere
- Use DI (built-in ASP.NET Core)
- Keep controllers thin, move logic to services

### Frontend

- Functional components
- Hooks-based architecture
- Keep components small and reusable

---

## Testing Strategy

- Manual testing is acceptable for MVP
- Focus on:
  - Timing correctness
  - Score calculation
  - Reconnection behavior

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Wi-Fi instability | Keep payloads small, retry connections |
| Users joining twice | Use session tokens |
| Duplicate names | Warn or allow but distinguish internally |
| Admin mistakes | Add confirmation before advancing |

---

## Summary

kweez is a focused, real-time quiz system built for live experiences.

The most critical aspects are:
- Reliable real-time communication (SignalR)
- Server-controlled timing
- Simple, responsive mobile UI

Everything else is secondary.
