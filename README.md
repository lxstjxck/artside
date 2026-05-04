# Artside

Artside is a Next.js app for publishing, browsing, opening and saving visual works.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma
- SQLite for local development
- JWT sessions in `httpOnly` cookies

## Features

- Public home feed with popular works and recommendations
- Category filtering on the home page
- Work detail pages and modal previews
- Registration, login, logout and session endpoint
- User profile with editable profile data
- Work publishing from the owner profile
- Work editing and deletion by the owner
- Saved works for authenticated users
- Notifications API with read state

## Environment

Create `.env` from `.env.example`:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-secret"

# Optional S3/R2-compatible storage for uploaded images.
S3_BUCKET=""
S3_REGION="auto"
S3_ENDPOINT=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_PUBLIC_BASE_URL=""
```

`AUTH_SECRET` is required in production.
When `S3_*` variables are not set, uploads are stored locally in `public/uploads` for development.

## Local Development

```bash
npm install
npm run prisma:generate
npm run dev
```

Open `http://localhost:3000`.

## Database

Generate Prisma Client:

```bash
npm run prisma:generate
```

Create or update local migrations:

```bash
npx prisma migrate dev
```

Local SQLite files under `prisma/dev.db` are ignored and should not be committed.

## Scripts

- `npm run dev` - start local development server
- `npm run build` - production build
- `npm run start` - start production server
- `npm run lint` - run ESLint
- `npm run prisma:generate` - generate Prisma Client
- `npm run db:studio` - open Prisma Studio

## API

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

Works:
- `GET /api/home-feed`
- `POST /api/works`
- `PATCH /api/works/[workId]`
- `DELETE /api/works/[workId]`
- `GET /work/[workId]`

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
