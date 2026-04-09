# Kweez

A self-hosted, real-time quiz application inspired by Kahoot!, designed for live events such as parties, team buildings, and classrooms.

Participants join using a QR code, enter their name, and answer timed questions in sync. The administrator controls the quiz flow in real time.

## Features

- **Real-time synchronization** - All players see questions and results simultaneously
- **QR code joining** - Players scan a code to join instantly
- **Mobile-first design** - Large touch targets, responsive layout
- **Multi-language support** - English and Portuguese (more can be added)
- **Auto-translation** - Translate quiz content using DeepL (optional)
- **Fixed QR codes** - Quizzes can have permanent QR codes that work across sessions
- **Google OAuth** - Secure admin access with Google authentication
- **Self-hosted** - Run on your own server with Docker

## How It Works

### For Players

1. **Join** - Scan the QR code or visit the join URL with the session code
2. **Enter name** - Type your display name
3. **Wait** - See other players joining in the lobby
4. **Play** - Answer questions by tapping one of the four colored buttons
5. **Change answer** - You can change your answer until time runs out (but timing matters for scoring!)
6. **See results** - After each question, see if you were correct and view the leaderboard
7. **Final standings** - See the final rankings at the end

### For Administrators

1. **Login** - Sign in with your authorized Google account at `/admin/login`
2. **Create quiz** - Add questions with 4 answer options each, set time limits
3. **Start session** - Create a new session and share the QR code
4. **Control flow** - Release questions one by one, force-close if needed
5. **End quiz** - Show final results to all players

### Scoring

Points are awarded based on speed:

```
score = max(0, 1000 - elapsed_ms × 0.06)
```

- Maximum 1000 points for instant answers
- Points decrease the longer you take
- Only correct answers earn points
- Changing your answer updates your response time

## Self-Hosting

### Prerequisites

- Docker and Docker Compose
- A domain with HTTPS (recommended for production)
- Google Cloud Console account (for OAuth)

### Quick Start (Local Development)

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/kweez.git
   cd kweez
   ```

2. **Create environment file**

   ```bash
   cp .env.example .env
   ```

3. **Start the services**

   ```bash
   docker compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

Note: Google OAuth won't work without proper configuration (see below).

### Production Deployment

1. **Set up your server** with Docker and a reverse proxy (e.g., Caddy, Nginx, Traefik)

2. **Configure environment variables** in your `.env` file:

   ```bash
   # Database (use a strong password!)
   POSTGRES_USER=kweez
   POSTGRES_PASSWORD=your-secure-password
   POSTGRES_DB=kweez

   # URLs (replace with your domain)
   ALLOWED_ORIGINS=https://your-domain.com
   VITE_API_URL=https://your-domain.com
   FRONTEND_URL=https://your-domain.com

   # Google OAuth (see configuration section below)
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret

   # Admin email (only this email can access admin)
   AUTH_ADMIN_EMAIL=your-email@gmail.com
   ```

3. **Configure your reverse proxy** to:
   - Proxy requests to the frontend container (port 3000)
   - Proxy `/api` and `/quizHub` requests to the backend container (port 5000)
   - Enable WebSocket support for `/quizHub`
   - Set `X-Forwarded-Proto` and `X-Forwarded-Host` headers

   Example Caddy configuration:

   ```
   your-domain.com {
       handle /api/* {
           reverse_proxy localhost:5000
       }
       handle /quizHub* {
           reverse_proxy localhost:5000
       }
       handle {
           reverse_proxy localhost:3000
       }
   }
   ```

4. **Start the services**

   ```bash
   docker compose up -d --build
   ```

## Google OAuth Configuration

Google OAuth is required to access the admin area. Only the email address specified in `AUTH_ADMIN_EMAIL` can log in.

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **OAuth consent screen**

### Step 2: Configure OAuth Consent Screen

1. Select **External** user type (unless you have Google Workspace)
2. Fill in the required fields:
   - **App name**: Kweez (or your preferred name)
   - **User support email**: Your email
   - **Developer contact email**: Your email
3. Add scopes: `email`, `profile`, `openid`
4. Add your admin email as a test user (required while app is in testing mode)
5. Save and continue

### Step 3: Create OAuth Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Web application**
4. Configure:
   - **Name**: Kweez Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for local development)
     - `https://your-domain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:5000/api/auth/google/callback` (for local development)
     - `https://your-domain.com/api/auth/google/callback` (for production)
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### Step 4: Update Environment Variables

Add the credentials to your `.env` file:

```bash
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
AUTH_ADMIN_EMAIL=your-email@gmail.com
```

### Step 5: Restart Services

```bash
docker compose up -d --build
```

### Troubleshooting OAuth

- **"Access denied" error**: Make sure the email you're logging in with matches `AUTH_ADMIN_EMAIL` exactly
- **Redirect URI mismatch**: Ensure the redirect URI in Google Console matches your domain exactly, including the protocol (https)
- **App not verified warning**: This is normal for apps in testing mode. Click "Continue" to proceed
- **Cookie issues**: Make sure your reverse proxy is forwarding headers correctly and the site is served over HTTPS

## Auto-Translation (Optional)

Kweez can automatically translate quiz questions and answers using DeepL. This feature is optional - the application works without it, but the translate buttons will be disabled.

### Setting up DeepL

1. Go to [DeepL API](https://www.deepl.com/pro-api)
2. Click **Sign up for free** to create a free account
3. Verify your email address
4. Once logged in, go to your [Account Summary](https://www.deepl.com/account/summary)
5. Scroll down to the **Authentication Key for DeepL API** section
6. Copy your API key

### Free Tier Limits

The DeepL API Free plan includes:
- **500,000 characters per month** (resets monthly)
- A typical question with 4 answers uses ~200-300 characters
- This allows approximately **1,500-2,500 question translations per month**

### Configure DeepL in Kweez

Add your API key to your `.env` file:

```bash
DEEPL_API_KEY=your-deepl-api-key
```

Then restart the services:

```bash
docker compose up -d --build
```

### Using Auto-Translation

Once configured, you can:

1. **Translate individual questions**: When editing a question, switch to a non-default language tab and click the "Translate from [Language]" button
2. **Bulk translate when adding a language**: When adding a new language to a quiz, check the "Automatically translate all questions" option to translate all existing questions at once

### Supported Languages

DeepL supports translation between: Danish, German, English, Spanish, French, Portuguese, Dutch, Italian, Polish, Russian, Japanese, Chinese, and many more.

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | Database username | `kweez` |
| `POSTGRES_PASSWORD` | Database password | `kweez_secret` |
| `POSTGRES_DB` | Database name | `kweez` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |
| `VITE_API_URL` | API URL for frontend | `http://localhost:5000` |
| `FRONTEND_URL` | Frontend URL for OAuth redirects | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | (required) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | (required) |
| `AUTH_ADMIN_EMAIL` | Email allowed to access admin | `thomasphansen@gmail.com` |
| `DEEPL_API_KEY` | DeepL API key for auto-translation | (optional) |

## Tech Stack

- **Frontend**: React, TypeScript, Material UI, Vite
- **Backend**: ASP.NET Core (.NET 10), SignalR, Entity Framework Core
- **Database**: PostgreSQL
- **Infrastructure**: Docker, Docker Compose

## Development

### Running without Docker

**Backend:**

```bash
cd backend
dotnet run
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

**Backend tests:**

```bash
cd backend.Tests
dotnet test
```

**Frontend tests:**

```bash
cd frontend
npm test
```

## License

MIT License - feel free to use this for your own events!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
