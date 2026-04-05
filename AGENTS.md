# AGENTS.md — kweez

## Project Overview

**kweez** is a self-hosted, real-time quiz web application inspired by Kahoot!, designed for live events such as parties.

Participants join using a QR code, enter their name, and answer timed questions in sync. The administrator controls quiz flow in real time.

The system is optimized for:
- Small to medium groups (10–50 concurrent users)
- Low latency (real-time synchronization)
- Simple deployment (Docker-based, self-hosted)

---

## Current Implementation Status

### Completed Features

#### Backend (ASP.NET Core .NET 10)
- **Database**: PostgreSQL with Entity Framework Core
- **Models**: Quiz, Question, AnswerOption, QuizSession, Participant, ParticipantAnswer
- **Services**: QuizService, SessionService, ScoringService
- **Controllers**: QuizzesController, SessionsController
- **SignalR Hub**: QuizHub with real-time events
- **Fixed Join Codes**: Quizzes can have permanent QR codes that work across sessions

#### Frontend (React + TypeScript + MUI)
- **Layout**: Header ("Kweez") and footer ("Kweez - © 2026 - Thomas Hansen") on all pages except print
- **Player Pages**: JoinPage, WaitPage, StartedPage, PlayPage, ResultsPage, FinalPage
- **Admin Pages**: AdminDashboard, QuizEditor, LiveControl, PrintQRCode
- **Real-time**: SignalR integration via SessionContext
- **Mobile-first**: Responsive design with large touch targets

#### Infrastructure
- **Docker Compose**: frontend, backend, postgres services
- **Solution file**: `Kweez.slnx` (new XML format)

---

## Core Concepts

### Roles

- **Player**
  - Joins via QR code or join code
  - Enters name
  - Answers questions (can change answer until time runs out)
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
  - Vite for build tooling

- **Backend**
  - ASP.NET Core (.NET 10)
  - SignalR for real-time communication
  - Entity Framework Core

- **Database**
  - PostgreSQL

- **Infrastructure**
  - Docker + Docker Compose

---

## Project Structure

```
kweez/
├── backend/
│   ├── Controllers/
│   │   ├── QuizzesController.cs
│   │   └── SessionsController.cs
│   ├── Data/
│   │   └── KweezDbContext.cs
│   ├── DTOs/
│   │   └── DTOs.cs
│   ├── Hubs/
│   │   └── QuizHub.cs
│   ├── Models/
│   │   ├── Quiz.cs
│   │   ├── Question.cs
│   │   ├── AnswerOption.cs
│   │   ├── QuizSession.cs
│   │   ├── Participant.cs
│   │   └── ParticipantAnswer.cs
│   ├── Services/
│   │   ├── QuizService.cs
│   │   ├── SessionService.cs
│   │   └── ScoringService.cs
│   └── Migrations/
├── backend.Tests/
│   └── Services/
│       ├── QuizServiceTests.cs
│       ├── SessionServiceTests.cs
│       └── ScoringServiceTests.cs
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Layout.tsx
│       │   └── ConnectionStatus.tsx
│       ├── context/
│       │   └── SessionContext.tsx
│       ├── pages/
│       │   ├── player/
│       │   │   ├── JoinPage.tsx
│       │   │   ├── WaitPage.tsx
│       │   │   ├── StartedPage.tsx
│       │   │   ├── PlayPage.tsx
│       │   │   ├── ResultsPage.tsx
│       │   │   └── FinalPage.tsx
│       │   └── admin/
│       │       ├── AdminDashboard.tsx
│       │       ├── QuizEditor.tsx
│       │       ├── LiveControl.tsx
│       │       └── PrintQRCode.tsx
│       ├── services/
│       │   ├── api.ts
│       │   └── signalr.ts
│       └── types/
│           └── index.ts
├── docker-compose.yml
└── Kweez.slnx
```

---

## Game Flow

1. Player scans QR code → opens `/join?code=XXXXXX`
2. Player enters name → joins session → `/wait`
3. Player waits in lobby (sees other players)
4. Admin clicks "Start Quiz" → Players see `/started` ("Kweez has started!")
5. For each question:
   - Admin releases question
   - Players see `/play` with 4 colored answer buttons
   - Players can click/change answer until time runs out
   - Server closes question automatically (or admin force-closes)
   - Players see `/results` with correct answer highlighted
6. After last question:
   - Admin clicks "Final Results"
   - Players see `/final` with final leaderboard

---

## Scoring Rules

```
score = max(0, 1000 - elapsed_ms * 0.06)
```

Where:
- `elapsed_ms` = server time difference between question release and answer submission
- **If player changes answer**: the time of the NEW answer is used for scoring
- **If player clicks same answer again**: original time is kept

Rules:
- Only correct answers score points
- All scoring happens on the server
- Score is calculated when question closes (not on submission)
- Client timestamps are never trusted

---

## SignalR Events

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| SessionState | SessionState | Full session state (on join/reconnect) |
| SessionStarted | - | Quiz has started |
| PlayerJoined | Participant | New player joined |
| QuestionReleased | QuestionReleased | New question to answer |
| AnswerSubmitted | { selectedAnswerId } | Confirmation of answer selection |
| QuestionClosed | QuestionResults | Question ended, shows results |
| LeaderboardUpdated | LeaderboardEntry[] | Updated rankings |
| QuizEnded | LeaderboardEntry[] | Final results |
| Error | string | Error message |

### Client → Server

| Method | Parameters | Description |
|--------|------------|-------------|
| JoinSession | participantId | Player joins session |
| JoinAsAdmin | sessionId | Admin joins to control |
| SubmitAnswer | participantId, questionId, answerId | Submit/change answer |
| StartQuiz | sessionId | Start the quiz |
| ReleaseNextQuestion | sessionId | Show next question |
| ForceCloseQuestion | sessionId | End question early |
| EndQuiz | sessionId | End quiz, show final results |

---

## Database Schema

### Tables

- **Quizzes**: id, title, description, fixedJoinCode?, createdAtUtc
- **Questions**: id, quizId, text, timeLimitSeconds, orderIndex
- **AnswerOptions**: id, questionId, text, isCorrect, orderIndex
- **QuizSessions**: id, quizId, joinCode, status, startedAtUtc?, endedAtUtc?
- **Participants**: id, sessionId, name, totalScore, joinedAtUtc, isConnected
- **ParticipantAnswers**: id, participantId, questionId, answerOptionId, submittedAtUtc, responseTimeMs, score

### Key Constraints

- QuizSession.JoinCode: unique, varchar(10)
- ParticipantAnswer: unique index on (participantId, questionId)
- Cascade deletes: Quiz → Questions → AnswerOptions
- Cascade deletes: Question/AnswerOption → ParticipantAnswers

---

## Key Implementation Details

### Fixed Join Codes
- Quizzes can have a `fixedJoinCode` for permanent QR codes
- When creating a new session, if the quiz has a fixed code:
  - Old sessions with that code get their code changed to "X" + random suffix
  - New session gets the fixed code
- PrintQRCode page generates 8 printable QR code cards per A4 page

### Answer Changing
- Players can change their answer until time runs out or question closes
- Only one ParticipantAnswer record per player per question
- Changing answer updates both `answerOptionId` AND `responseTimeMs`
- Clicking same answer again is ignored (keeps original time)

### Results Display
- Correct answer: green border with glow effect
- Wrong answers: darkened (40% mix with black)
- Player's selection: check/X icon overlay (green or red)

### Layout
- All pages (except PrintQRCode) have header and footer
- Content area is scrollable, fits within viewport
- Mobile-responsive with larger buttons on small screens

---

## UI/UX Details

### Answer Colors
```typescript
const answerColors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c']
// Red, Blue, Yellow, Green
```

### Player Flow States
1. `/join` - Enter name with join code
2. `/wait` - Lobby, see other players
3. `/started` - "Kweez has started!" transition screen
4. `/play` - Answer question (can change selection)
5. `/results` - See correct answer and leaderboard
6. `/final` - Final standings

### Admin Live Control
- Shows QR code while waiting
- "Start Quiz" button (disabled until players join)
- "First Question" → "Next Question" → "Final Results" button progression
- "Force Close Question" to end early
- "End Quiz" with confirmation dialog

---

## Testing

### Backend Tests (76 tests)
- QuizServiceTests: CRUD operations
- SessionServiceTests: Session lifecycle, state management
- ScoringServiceTests: Score calculation, answer changing

### Frontend Tests (75 tests)
- SignalR service tests
- SessionContext tests
- Component tests (PlayPage, WaitPage, ConnectionStatus)

### Running Tests
```bash
# Backend
cd backend && dotnet test

# Frontend
cd frontend && npm test
```

---

## Development Commands

### Backend
```bash
# Run with watch
cd backend && dotnet watch run

# Add migration
dotnet ef migrations add MigrationName

# Update database
dotnet ef database update
```

### Frontend
```bash
# Development server
cd frontend && npm run dev

# Build
npm run build

# Type check
npm run typecheck
```

### Docker
```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Rebuild
docker compose up -d --build
```

---

## Known Quirks

1. **EF Core InMemory provider**: When replacing child collections, must delete and save first, then add new items in separate save.

2. **Fixed QR code replay**: Join codes have unique constraint, so when reusing fixed codes, old sessions get code changed to "X" + random suffix.

3. **Print page**: Uses internal padding (10mm) instead of @page margins for better cross-browser print support.

---

## Coding Conventions

### Backend
- Use async/await everywhere
- Use DI (built-in ASP.NET Core)
- Keep controllers thin, move logic to services
- Solution file: `Kweez.slnx` (new XML format)

### Frontend
- Functional components with hooks
- SessionContext for all game state
- MUI components with sx prop for styling
- Responsive breakpoints: xs (mobile), sm (tablet+)

---

## Summary

kweez is a focused, real-time quiz system built for live experiences.

The most critical aspects are:
- Reliable real-time communication (SignalR)
- Server-controlled timing and scoring
- Simple, responsive mobile UI
- Answer changing allowed until question closes

Everything else is secondary.
