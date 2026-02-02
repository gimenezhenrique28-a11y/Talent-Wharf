# Talent Wharf

Multi-tenant talent management platform. Each company gets isolated data. The API serves both the web app (JWT auth) and the Chrome extension (API key auth).

## Tech Stack

- **Runtime**: Node.js + Express
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT (web app) + API keys (Chrome extension)

## Project Structure

```
prisma/
  schema.prisma      # Database schema (all models)
  seed.js            # Demo data seeder
src/
  config/
    database.js      # Prisma client singleton
    cors.js          # CORS config (app + extension origins)
  middleware/
    auth.js          # Dual auth: JWT & API key + role guard
  routes/
    auth.js          # Register, login, invite users
    candidates.js    # CRUD + notes (used by app & extension)
    jobs.js          # Job postings + pipeline + applications
    apikeys.js       # Generate/revoke API keys for extensions
  server.js          # Express entry point
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env and configure your database URL
cp .env.example .env

# 3. Run migrations
npx prisma migrate dev --name init

# 4. (Optional) Seed demo data
npm run db:seed

# 5. Start the server
npm run dev
```

## Multi-Tenancy

Every table is scoped to a `companyId`. When a new company registers, they get their own isolated dataset. The auth middleware injects the company scope into every query, so no company can see another's data.

## Connecting the Chrome Extension

1. An admin generates an API key at `POST /api-keys`
2. The extension stores the key and sends it as `X-API-Key` header on every request
3. The same candidate, job, and notes endpoints work for both the app and the extension

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | Public | Create company + admin |
| POST | /auth/login | Public | Login, get JWT |
| GET | /auth/me | JWT/Key | Current user profile |
| POST | /auth/users | Admin | Invite user to company |
| GET | /candidates | JWT/Key | List candidates |
| POST | /candidates | JWT/Key | Add candidate |
| GET | /candidates/:id | JWT/Key | Candidate detail |
| PUT | /candidates/:id | JWT/Key | Update candidate |
| DELETE | /candidates/:id | JWT/Key | Delete candidate |
| POST | /candidates/:id/notes | JWT/Key | Add note |
| GET | /jobs | JWT/Key | List jobs |
| POST | /jobs | JWT/Key | Create job |
| GET | /jobs/:id | JWT/Key | Job detail + applicants |
| PUT | /jobs/:id | JWT/Key | Update job |
| POST | /jobs/:id/apply | JWT/Key | Apply candidate to job |
| GET | /api-keys | Admin | List API keys |
| POST | /api-keys | Admin | Generate new key |
| DELETE | /api-keys/:id | Admin | Revoke key |