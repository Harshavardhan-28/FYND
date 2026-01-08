# Two-Dashboard AI Feedback System

A production-ready customer feedback system built with Next.js 14, Firebase Realtime Database, and Google Gemini AI.

## Features

- 🎯 **User Dashboard**: Beautiful feedback form with star ratings and AI-powered responses
- 📊 **Admin Dashboard**: Real-time analytics and live review monitoring
- 🤖 **AI Processing**: Gemini 3.0 Flash Preview for intelligent feedback analysis
- 🔥 **Real-time Updates**: WebSocket-based live feed using Firebase RTDB
- ✅ **Type-Safe**: Full TypeScript with Zod validation
- 🎨 **Modern UI**: Tailwind CSS with smooth animations

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Firebase Realtime Database
- **AI**: Google Gemini API (gemini-3.0-flash-preview)
- **Validation**: Zod
- **Styling**: Tailwind CSS
- **Icons**: lucide-react

## Project Structure

```
├── app/
│   ├── page.tsx                 # User Dashboard (Feedback Form)
│   ├── admin/
│   │   └── page.tsx            # Admin Dashboard (Live Feed)
│   └── api/
│       └── review/
│           └── route.ts        # API endpoint (Validation → AI → DB)
├── lib/
│   ├── types.ts                # Zod schemas & TypeScript interfaces
│   ├── firebase.ts             # Firebase Client SDK (for admin)
│   └── firebaseAdmin.ts        # Firebase Admin SDK (for API)
└── .env.example                # Environment variables template
```

## Setup Instructions

### 1. Clone and Install

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

**Required Variables:**

- **Firebase Admin SDK**: Get service account key from [Firebase Console](https://console.firebase.google.com) → Project Settings → Service Accounts
- **Firebase Client SDK**: Get web app config from Firebase Console → Project Settings → General
- **Gemini API**: Get API key from [Google AI Studio](https://aistudio.google.com/apikey)

### 3. Firebase Setup

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable **Realtime Database** (not Firestore)
3. Set database rules (for development):
   ```json
   {
     "rules": {
       "reviews": {
         ".read": true,
         ".write": true
       }
     }
   }
   ```
4. Download service account key and add to `.env.local`

### 4. Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) for the user dashboard and [http://localhost:3000/admin](http://localhost:3000/admin) for the admin dashboard.

## Usage

### User Dashboard (`/`)
1. Select a star rating (1-5)
2. Write feedback (5-1000 characters)
3. Submit and receive AI-powered response
4. Data is automatically saved to Firebase

### Admin Dashboard (`/admin`)
- View real-time incoming reviews
- See analytics (total reviews, average rating)
- Monitor AI-generated summaries and action items
- Automatic updates via WebSocket connection

## API Endpoint

**POST** `/api/review`

Request body:
```json
{
  "rating": 5,
  "review": "Great service!"
}
```

Response:
```json
{
  "success": true,
  "message": "Thank you for your wonderful feedback! We're thrilled you enjoyed our service."
}
```

## Key Features

### Singleton Pattern
Firebase Admin SDK uses a singleton pattern to prevent "App already exists" errors during Next.js hot reloads.

### Real-time Sync
Admin dashboard connects to Firebase using client SDK with `onValue` listener for instant updates.

### AI Processing
- Model: `gemini-3.0-flash-preview`
- JSON mode for structured responses
- Generates: polite reply, 10-word summary, actionable step

### Validation
- Client-side: Zod schema validation before submit
- Server-side: Strict validation in API route
- Type-safe throughout the application

## Dependencies

Key packages required:
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "typescript": "^5.0.0",
    "zod": "^3.22.0",
    "@google/generative-ai": "^0.21.0",
    "firebase": "^10.0.0",
    "firebase-admin": "^12.0.0",
    "lucide-react": "^0.400.0"
  }
}
```

## Production Deployment

1. **Environment Variables**: Add all env vars to your hosting platform (Vercel, etc.)
2. **Firebase Rules**: Update database rules for production security
3. **API Security**: Consider rate limiting and authentication
4. **Build**: `npm run build`
5. **Deploy**: Follow your platform's deployment guide

## Security Notes

- Never commit `.env.local` to version control
- Keep `GEMINI_API_KEY` and `FIREBASE_SERVICE_ACCOUNT_KEY` secret
- Implement proper Firebase security rules in production
- Consider adding authentication for admin dashboard

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
