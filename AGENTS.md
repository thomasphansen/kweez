# AGENTS.md — kweez

## Project Overview

**kweez** is a self-hosted, real-time quiz web application inspired by Kahoot!, designed for live events such as parties, team buildings, and classrooms.

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
- **Models**: Quiz, Question, AnswerOption, QuizSession, Participant, ParticipantAnswer, QuizLanguage, QuestionTranslation, AnswerOptionTranslation
- **Services**: QuizService, SessionService, ScoringService, TranslationService, QuizNotificationService
- **Controllers**: QuizzesController, SessionsController, AuthController, TranslationController
- **SignalR Hub**: QuizHub with real-time events
- **Authentication**: Google OAuth with cookie-based sessions
- **Translation**: DeepL API integration for auto-translation

#### Frontend (React + TypeScript + MUI)
- **Theme**: Fresh & Vibrant light theme with teal primary color
- **Layout**: Header with language selector and footer with privacy policy link
- **Player Pages**: JoinPage, WaitPage, StartedPage, PlayPage, ResultsPage, FinalPage
- **Admin Pages**: LoginPage, AdminDashboard, QuizEditor, LiveControl, PrintQRCode
- **Display Page**: DisplayPage for projector/TV display during quiz
- **Other Pages**: PrivacyPolicy
- **Real-time**: SignalR integration via SessionContext
- **Authentication**: AuthContext with Google OAuth
- **Internationalization**: 4 languages (Danish, German, English, Portuguese) with auto-detection
- **Mobile-first**: Responsive design with large touch targets

#### Infrastructure
- **Docker Compose**: frontend, backend, postgres services
- **Solution file**: `Kweez.slnx` (new XML format)
- **Environment**: `.env` file for configuration

---

## Core Concepts

### Roles

- **Player**
  - Joins via QR code or join code
  - Enters name
  - Answers questions (can change answer until time runs out)
  - Sees score and rankings

- **Administrator**
  - Authenticates via Google OAuth
  - Creates and manages quizzes (with multi-language support)
  - Starts/stops quiz sessions
  - Releases questions
  - Controls progression

---

## Architecture Overview

### High-Level Stack

- **Frontend**
  - React 18 + TypeScript
  - MUI (Material UI) v5 with custom light theme
  - Vite for build tooling
  - i18next for internationalization
  - SignalR client for real-time

- **Backend**
  - ASP.NET Core (.NET 10)
  - SignalR for real-time communication
  - Entity Framework Core with PostgreSQL
  - Google OAuth authentication
  - DeepL API for translations

- **Database**
  - PostgreSQL 16

- **Infrastructure**
  - Docker + Docker Compose
  - Reverse proxy support (Caddy, Nginx, etc.)

---

## Project Structure

```
kweez/
├── backend/
│   ├── Controllers/
│   │   ├── AuthController.cs
│   │   ├── QuizzesController.cs
│   │   ├── SessionsController.cs
│   │   └── TranslationController.cs
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
│   │   ├── ParticipantAnswer.cs
│   │   ├── QuizLanguage.cs
│   │   ├── QuestionTranslation.cs
│   │   └── AnswerOptionTranslation.cs
│   ├── Services/
│   │   ├── QuizService.cs
│   │   ├── SessionService.cs
│   │   ├── ScoringService.cs
│   │   ├── TranslationService.cs
│   │   └── QuizNotificationService.cs
│   └── Migrations/
├── backend.Tests/
│   └── Services/
│       ├── QuizServiceTests.cs
│       ├── SessionServiceTests.cs
│       └── ScoringServiceTests.cs
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AdminRoute.tsx
│       │   ├── ConnectionStatus.tsx
│       │   └── Layout.tsx
│       ├── context/
│       │   ├── AuthContext.tsx
│       │   └── SessionContext.tsx
│       ├── i18n/
│       │   ├── index.ts
│       │   └── locales/
│       │       ├── da.json
│       │       ├── de.json
│       │       ├── en.json
│       │       └── pt.json
│       ├── pages/
│       │   ├── PrivacyPolicy.tsx
│       │   ├── player/
│       │   │   ├── JoinPage.tsx
│       │   │   ├── WaitPage.tsx
│       │   │   ├── StartedPage.tsx
│       │   │   ├── PlayPage.tsx
│       │   │   ├── ResultsPage.tsx
│       │   │   └── FinalPage.tsx
│       │   ├── admin/
│       │   │   ├── LoginPage.tsx
│       │   │   ├── AdminDashboard.tsx
│       │   │   ├── QuizEditor.tsx
│       │   │   ├── LiveControl.tsx
│       │   │   └── PrintQRCode.tsx
│       │   └── display/
│       │       └── DisplayPage.tsx
│       ├── services/
│       │   ├── api.ts
│       │   └── signalr.ts
│       ├── types/
│       │   └── index.ts
│       └── theme.ts
├── .env.example
├── docker-compose.yml
├── LICENSE.md
├── README.md
└── Kweez.slnx
```

---

## Game Flow

1. Player scans QR code → opens `/join?session=XXXXXX`
2. Player enters name → joins session → `/wait`
3. Player waits in lobby (sees other players joining)
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

## Authentication

### Google OAuth
- Cookie-based authentication (not JWT)
- Only authorized admin email can access admin area
- Configured via environment variables:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `AUTH_ADMIN_EMAIL`

### Protected Routes
- All `/admin/*` routes require authentication
- SignalR hub methods for admin actions check authorization
- Players do not require authentication

---

## Multi-Language Support

### UI Languages
- Danish (`da`)
- German (`de`)
- English (`en`)
- Portuguese (`pt`)

### Language Detection (Priority Order)
1. URL query parameter (`?lng=da`)
2. localStorage (user's previous selection)
3. Browser/device language
4. Fallback to English

### Quiz Content Languages
- Each quiz can have multiple content languages
- One language is marked as default
- Questions and answers can be translated per language
- Auto-translation via DeepL API (optional)

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
- **QuizLanguages**: id, quizId, languageCode, isDefault
- **Questions**: id, quizId, imageUrl?, timeLimitSeconds, orderIndex
- **QuestionTranslations**: id, questionId, languageCode, text
- **AnswerOptions**: id, questionId, isCorrect, orderIndex
- **AnswerOptionTranslations**: id, answerOptionId, languageCode, text
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

### Auto-Translation
- DeepL API integration (optional, requires API key)
- Translate individual questions from default language
- Bulk translate all questions when adding a new language
- Confirmation dialog before overwriting existing translations

### Results Display
- Correct answer: green border with glow effect
- Wrong answers: darkened (40% mix with black)
- Player's selection: check/X icon overlay (green or red)

### Layout
- All pages (except PrintQRCode) have header and footer
- Header: "Kweez!" title, language selector, logout button (admin only)
- Footer: Copyright and Privacy Policy link
- Content area is scrollable, fits within viewport
- Mobile-responsive with larger buttons on small screens

---

## UI/UX Details

### Theme (Fresh & Vibrant Light)
```typescript
// Primary colors
primary: '#00897B'     // Teal 600
secondary: '#FF7043'   // Coral (Deep Orange 400)
background: '#F5F5F5'  // Light Gray
paper: '#FFFFFF'       // White
```

### Answer Colors (Kahoot-style)
```typescript
const answerColors = ['#E21B3C', '#1368CE', '#D89E00', '#26890C']
// Red, Blue, Yellow, Green
```

### Player Flow States
1. `/join` - Enter name with join code
2. `/wait` - Lobby, see other players
3. `/started` - "Kweez has started!" transition screen
4. `/play` - Answer question (can change selection)
5. `/results` - See correct answer and leaderboard
6. `/final` - Final standings

### Admin Flow
1. `/admin/login` - Google OAuth sign-in
2. `/admin` - Dashboard with quiz list
3. `/admin/quiz/:id` - Quiz editor with multi-language support
4. `/admin/session/:id` - Live control panel
5. `/admin/print/:id` - Print QR codes

### Display Page
- `/display` - Full-screen display for projector/TV
- Shows QR code during waiting
- Shows questions and countdown during play
- Shows leaderboard and results
- Auto-refreshes when new session starts

---

## Testing

### Backend Tests (96 tests)
- QuizServiceTests: CRUD operations
- SessionServiceTests: Session lifecycle, state management
- ScoringServiceTests: Score calculation, answer changing

### Frontend Tests (92 tests)
- SignalR service tests
- SessionContext tests
- Component tests (PlayPage, WaitPage, ConnectionStatus)
- Localization tests

### Running Tests
```bash
# Backend
cd backend.Tests && dotnet test

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
npx tsc --noEmit

# Run tests
npm test
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

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `POSTGRES_USER` | Database username | Yes |
| `POSTGRES_PASSWORD` | Database password | Yes |
| `POSTGRES_DB` | Database name | Yes |
| `ALLOWED_ORIGINS` | CORS allowed origins | Yes |
| `VITE_API_URL` | API URL for frontend | Yes |
| `FRONTEND_URL` | Frontend URL for OAuth | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `AUTH_ADMIN_EMAIL` | Email allowed to access admin | Yes |
| `DEEPL_API_KEY` | DeepL API key for translation | No |

---

## Known Quirks

1. **EF Core InMemory provider**: When replacing child collections, must delete and save first, then add new items in separate save.

2. **Fixed QR code replay**: Join codes have unique constraint, so when reusing fixed codes, old sessions get code changed to "X" + random suffix.

3. **Print page**: Uses internal padding (10mm) instead of @page margins for better cross-browser print support.

4. **Reverse proxy**: When behind a reverse proxy, `UseForwardedHeaders()` must be called to read `X-Forwarded-Proto` headers for OAuth to work correctly.

5. **DeepL authentication**: Uses header-based authentication (`Authorization: DeepL-Auth-Key`) as legacy form body auth was deprecated in November 2025.

---

## Coding Conventions

### Backend
- Use async/await everywhere
- Use DI (built-in ASP.NET Core)
- Keep controllers thin, move logic to services
- Solution file: `Kweez.slnx` (new XML format)
- Protect admin endpoints with `[Authorize(Policy = "Admin")]`

### Frontend
- Functional components with hooks
- SessionContext for game state
- AuthContext for authentication state
- MUI components with sx prop for styling
- Responsive breakpoints: xs (mobile), sm (tablet+)
- i18next for all user-facing strings

---

## Summary

kweez is a focused, real-time quiz system built for live experiences.

The most critical aspects are:
- Reliable real-time communication (SignalR)
- Server-controlled timing and scoring
- Simple, responsive mobile UI
- Multi-language support for international audiences
- Answer changing allowed until question closes
- Google OAuth for admin security

Everything else is secondary.
