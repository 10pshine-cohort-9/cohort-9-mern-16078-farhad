# Notely

Notely is a private personal notes workspace built with React, Node.js, Express, tRPC, Drizzle ORM, and a MySQL-compatible database. Authentication is provided by the scaffold's secure OAuth session, while every note query and mutation is constrained by the authenticated user's database ID.

## Local setup in VS Code

Open the project folder in VS Code, install Node.js 20 or newer, and install pnpm. Then run `pnpm install`. Create a local `.env` from your environment's database and authentication values; do not commit secrets. The application expects `DATABASE_URL` to point to MySQL or TiDB and uses the scaffold-provided OAuth variables when running inside Manus. For a standalone local OAuth setup, configure a compatible callback at `/api/oauth/callback`.

Run `pnpm drizzle-kit generate` after schema changes, review the generated SQL, and apply it with your preferred MySQL migration workflow. The current schema creates `notes` with a foreign key to `users`, cascade deletion, and an ownership/update index.

Start the application with `pnpm dev`, then open the URL printed by the development server. The production workflow is `pnpm build` followed by `pnpm start`. Type checking uses `pnpm check`.

## Testing and quality

Run `pnpm test` to execute the Vitest suite. The included tests cover session logout behavior and can be extended with database-backed integration tests. SonarQube settings are stored in `sonar-project.properties`; run the SonarScanner from a SonarQube-enabled environment with `sonar-scanner` after setting the server URL and token externally.

## Security model

The backend never trusts a client-supplied user ID. Protected procedures receive the authenticated user from the session context, and each note operation adds `userId = ctx.user.id` to its database predicate. Attempting to read, update, or delete another user's note returns a not-found response rather than revealing whether that note exists. Inputs are validated with Zod, content length is bounded, cookies are redacted from logs, and unexpected server exceptions are converted to a safe generic response.

## Project structure

`client/src/pages/Home.tsx` contains the responsive dashboard and editor workspace. `server/routers.ts` contains the typed note procedures. `server/db.ts` contains user-scoped database helpers. `drizzle/schema.ts` contains the persistent schema. `server/_core/logger.ts` and `server/_core/index.ts` provide structured Pino logging and HTTP error handling. `todo.md` records implementation history and remaining work.
