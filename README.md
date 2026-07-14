# Comment System Backend

TypeScript + Express + MongoDB (Mongoose) backend for a comment system: JWT auth, threaded comments with likes/dislikes, and real-time updates over Socket.IO.

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- A MongoDB connection string (e.g. MongoDB Atlas)

## Getting started

```bash
git clone https://github.com/JoniSutradhor/social_sphere_backend
cd social_sphere_backend
npm install
cp .env.example .env   # then fill in MONGODB_URI and JWT_SECRET
npm run dev
```

`.env` is git-ignored — never commit real credentials to `.env.example`.

## Scripts

| Script                    | Purpose                                              |
| -------------------------- | ----------------------------------------------------- |
| `npm run dev`               | Start the dev server (`tsx watch`, auto-reloads)      |
| `npm run build`             | Type-check and compile `src/` to `dist/`              |
| `npm start`                 | Run the compiled server (`dist/server.js`)             |
| `npm run typecheck`         | Type-check without emitting output                    |
| `npm run migrate:comments`  | One-off migration for the legacy embedded-array comment shape |
| `npm run verify:indexes`    | Print the indexes on `users`/`comments`/`reactions`    |

## Architecture

- `src/models` — Mongoose schemas. Comments and replies share one flat `Comment` collection (`parentId` links a reply to its parent); likes/dislikes live in a separate `Reaction` collection with a unique `(commentId, userId)` index. Like/dislike counts are denormalized onto the comment document and updated atomically, so comment lists never have to compute counts at read time.
- `src/services` — business logic; comment/reply listing uses cursor (keyset) pagination rather than offset pagination, so it stays fast regardless of collection size.
- `src/controllers`, `src/routes` — thin HTTP layer; validation happens via `src/validators` (Zod) before a request reaches a controller.
- `src/middleware` — auth (JWT), centralized error handling, request validation, rate limiting.
- `src/sockets` — Socket.IO setup. Clients only ever send `join-page`/`leave-page`; all comment/reaction events are emitted server-side after a mutation is persisted via the authenticated REST API, so a client can't forge a fake real-time event.

## Real-time (Socket.IO) and serverless hosting

Socket.IO needs a persistent process to hold WebSocket connections open. If this is deployed to a serverless platform (e.g. a bare Vercel serverless function), real-time updates will not work reliably across invocations — run this on a persistent-process host (a VM, Render, Railway, etc.) if real-time comments matter.

---

Author: Joni Kumar Sutradhor — https://www.linkedin.com/in/joni-kumar-sutradhor-883a28185/
