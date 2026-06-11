# Deploy to Vercel with Cloudflare R2

This project can stay on SQLite locally, but production on Vercel needs:

- PostgreSQL for Prisma data.
- Cloudflare R2 or another S3-compatible bucket for uploaded images.

## 1. Database

Create a PostgreSQL database in Neon, Supabase, Railway, or Vercel Postgres.

Copy the production connection string into Vercel as:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

The Vercel build uses `npm run vercel-build`. It generates a temporary PostgreSQL Prisma schema and runs:

```bash
prisma db push --schema prisma/schema.production.prisma
```

## 2. Cloudflare R2

Create an R2 bucket and an R2 API token with object read/write access.

Add these variables to Vercel:

```env
S3_BUCKET="artside-uploads"
S3_REGION="auto"
S3_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
S3_ACCESS_KEY_ID="<R2_ACCESS_KEY_ID>"
S3_SECRET_ACCESS_KEY="<R2_SECRET_ACCESS_KEY>"
S3_PUBLIC_BASE_URL="https://<PUBLIC_R2_DOMAIN>"
```

`S3_PUBLIC_BASE_URL` must be a public URL that can serve uploaded objects. Use either:

- R2 custom domain, recommended.
- R2 public development URL, acceptable for a short demo.

## 3. Required Vercel variables

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="<long-random-secret>"
APP_URL="https://<your-vercel-domain>"
APP_NAME="ArtSide"
S3_BUCKET="..."
S3_REGION="auto"
S3_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
S3_PUBLIC_BASE_URL="https://..."
```

Optional password reset email variables:

```env
SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
MAIL_FROM="ArtSide <no-reply@example.com>"
```

## 4. Vercel settings

Build command is configured in `vercel.json`:

```bash
npm run vercel-build
```

After the first deploy, open the Vercel URL and register a user. If demo content is needed in production, run `npm run db:seed` locally with `DATABASE_URL` temporarily set to the production PostgreSQL URL.
