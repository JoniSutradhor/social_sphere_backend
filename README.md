# Social Sphere Backend

TypeScript + Express + MongoDB (Mongoose) backend for a small social feed: JWT auth, posts, threaded comments with likes/dislikes, and real-time updates over Socket.IO.

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
| `npm run sync:indexes`      | Rebuild indexes to match the current schemas (run after any indexed-field change) |
| `npm run verify:indexes`    | Print the indexes on `users`/`posts`/`comments`/`reactions` |

## Architecture

- `src/models` — Mongoose schemas. `Post` is the root content type, with a `visibility` of `public` (default) or `private` (visible only to its author). Comments and replies share one flat `Comment` collection (`postId` links a comment to its post, `parentId` links a reply to its parent) — a comment thread inherits its post's visibility, so a private post's comments are 404 to everyone but the author, even by guessing a comment id directly. Likes/dislikes on both posts and comments live in a single polymorphic `Reaction` collection (`targetType` + `targetId`) with a unique `(targetType, targetId, userId)` index. Like/dislike/comment counts are denormalized onto the post/comment documents and updated atomically, so lists never have to compute counts at read time.
- `src/services` — business logic; feed and comment/reply listing use cursor (keyset) pagination rather than offset pagination, so they stay fast regardless of collection size. GET routes use `optionalAuth` (decodes a JWT if present, but doesn't require one) so anonymous browsing still works while an authenticated viewer gets their own like/dislike state (`userReaction`) attached to each post/comment, and can see their own private posts. `GET /posts/:id/likes` and `GET /comments/:id/likes` list who reacted.
- `src/controllers`, `src/routes` — thin HTTP layer; validation happens via `src/validators` (Zod) before a request reaches a controller.
- `src/middleware` — auth (JWT, required or optional), centralized error handling, request validation, rate limiting.
- `src/sockets` — Socket.IO setup. Clients only ever send `join-post`/`leave-post` (room = post id); all post/comment/reaction events are emitted server-side after a mutation is persisted via the authenticated REST API, so a client can't forge a fake real-time event.

## Real-time (Socket.IO) and serverless hosting

Socket.IO needs a persistent process to hold WebSocket connections open. If this is deployed to a serverless platform (e.g. a bare Vercel serverless function), real-time updates will not work reliably across invocations — run this on a persistent-process host (a VM, Render, Railway, etc.) if real-time comments matter.

---

Author: Joni Kumar Sutradhor — https://www.linkedin.com/in/joni-kumar-sutradhor-883a28185/
