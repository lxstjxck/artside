# Artside

Artside is a Next.js 16 app with:
- homepage feed (`popular` + `recommendations`)
- server-side authentication (register/login/logout/session)
- profile page with server-side data
- saved works bound to authenticated user
- notifications API with read state

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Prisma
- SQLite (local)
- JWT sessions in `httpOnly` cookies

## Project Structure

- `src/app` - app routes and API routes
- `src/app/api` - backend endpoints (auth, profile, feed, saved works, notifications)
- `src/lib` - server/business logic (`user-store`, `saved-work-store`, `work-store`, etc.)
- `prisma` - Prisma schema and SQL migration snapshot
- `data` - legacy JSON files used for one-time import fallback

## Environment Variables

Create `.env` (or copy from `.env.example`):

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="change-me-in-production"
```

## Run Locally

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Start dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

- `npm run dev` - run local development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm run prisma:generate` - generate Prisma client
- `npm run db:studio` - open Prisma Studio

## API Overview

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

Feed:
- `GET /api/home-feed`

Profile:
- `GET /api/profile/[username]`
- `GET /api/profile`
- `PATCH /api/profile`

Saved works:
- `GET /api/saved-works`
- `POST /api/saved-works`
- `DELETE /api/saved-works/[workId]`

Notifications:
- `GET /api/notifications`
- `POST /api/notifications/read-all`

## Notes

- User/session-specific data is now served from backend endpoints.
- SQLite schema is bootstrapped on first access via `db-bootstrap`, with import from legacy JSON if DB is empty.
- Local DB files are ignored in git.

---

Проект реализован с использованием вайбкодинг-подхода: быстрые итерации, живой цикл правок и фокус на практический результат.
