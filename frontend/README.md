# GymMatch frontend

A responsive React + TypeScript interface for the existing GymMatch backend. The app includes email/password authentication, profile creation and editing, a progress dashboard, workout management, and exercise leaderboards with Socket.IO updates. All application changes are contained in `frontend/`.

## Run locally

Use Node.js 22.12+ (Node 24 is supported).

```sh
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite, normally http://localhost:5173. The existing backend must run separately on port 3000, with its PostgreSQL database, Redis instance, and environment variables configured. Start it with `npm run dev` from `backend/`.

The development server proxies `/api` and `/socket.io` to `http://localhost:3000`. To change this, create a local `frontend/.env.local` file containing `BACKEND_URL=http://localhost:YOUR_PORT`. Environment files are ignored by Git. Restart Vite after changing environment variables.

For a separately hosted API, set these build-time variables:

```dotenv
VITE_API_URL=https://your-api.example.com/api
VITE_SOCKET_URL=https://your-api.example.com
```

Without explicit URLs, production uses `/api` and the current origin for Socket.IO. The hosting reverse proxy must forward both paths, including WebSocket upgrades. Configure the frontend host to serve `index.html` for client routes such as `/workouts` and `/profile`. Never put database credentials or the JWT secret in `VITE_*` variables.

## Screens

- **Sign in / sign up:** uses the returned JWT immediately, remembers the session across reloads, preserves the destination when sign-in is required, handles rejected credentials, and clears expired sessions on HTTP 401. Signing out also disconnects live updates. Session changes sync across browser tabs.
- **Overview:** derives total workout entries, lifted volume (`weight × sets × reps`), backend PR flags, seven-day activity, recent workouts, and profile details from your data. There is no demo data in the application.
- **My workouts:** creates, edits, and deletes entries; supports dates, integer weight in kg, sets, reps, duration in minutes, rest time in seconds, and notes. Includes local search, strength/cardio/PR filters, date sorting, and ten-row pages. The API is fetched in pages of 100 until the final short page so statistics and search include the complete history. For very large histories, server-side aggregate and filter endpoints would be preferable.
- **Leaderboard:** displays the backend's top 10 for a selected exercise, highlights your rank, refreshes on matching `leaderboard_update` events, rejoins rooms after reconnection, and supports manual refresh.
- **My profile:** creates or updates all implemented profile fields. Only the name is required. Suggestions are editable text because the database stores these values as unrestricted text.

Forms preserve input after failed saves, pending operations disable duplicate submissions, deletion requires confirmation, and dialogs use native focus trapping and Escape handling. Pages include loading, error/retry, and empty states. Layouts adapt to desktop and mobile, with keyboard labels and reduced-motion support.

## Exercise selection

The backend has no exercise catalog route. The frontend therefore does not guess exercise IDs or request an unimplemented endpoint.

- Exercises from workout history automatically populate the picker with their actual names, IDs, and types.
- An **Exercise ID** field allows logging an existing exercise before it appears in history.
- Optionally populate `src/config/exercises.ts` with exact rows from your existing database to offer names to new users immediately:

```ts
export const configuredExercises: Exercise[] = [
  // Add { id, name, type } objects that match your database.
];
```

## Existing API contract

All routes below are relative to the API base URL. Protected calls send `Authorization: Bearer <token>`.

| Method | Route                        | Frontend use / response                                                          |
| ------ | ---------------------------- | -------------------------------------------------------------------------------- |
| POST   | `/auth/signup`               | `{ email, password }` → `{ user, token }`                                        |
| POST   | `/auth/login`                | `{ email, password }` → `{ user, token }`                                        |
| GET    | `/profile/me`                | `{ profile }`; the exact existing missing-profile error enters the creation flow |
| POST   | `/profile`                   | Creates a profile → `{ message, profile }`                                       |
| PUT    | `/profile/me`                | Updates a profile → `{ profile }`                                                |
| GET    | `/workouts?page=N&limit=100` | `{ workouts }`, including joined exercise names and types                        |
| POST   | `/workouts`                  | Creates a workout → `{ message, workout }`                                       |
| PUT    | `/workouts/:id`              | Updates a workout → `{ message, workout }`                                       |
| DELETE | `/workouts/:id`              | Deletes a workout → `{ message }`                                                |
| GET    | `/leaderboard?exercise_id=N` | `{ leaderboard }`                                                                |

The backend also exposes `GET /health` and `GET /profile/:userId`. The latter only authorizes the current user's own ID, so there is no public athlete-profile navigation. No matching, messaging, password reset, exercise creation, or other unimplemented features are exposed.

### Socket.IO

- Emits `register_user` with the authenticated user ID on every connection.
- Emits `join_exercise` with the selected exercise ID, including after reconnection.
- Listens for `notification` and shows the personal-record message.
- Listens for `leaderboard_update` and refetches only when `exercise_id` matches the visible leaderboard.
- The server has no `leave_exercise` event. Old rooms remain joined for the lifetime of that connection; events are filtered by the current exercise. Listeners are removed when the page unmounts, and the connection is closed when the session ends.

## Backend integration issues found during implementation

These are existing backend issues; no backend files were changed.

1. **Leaderboard SQL:** `backend/src/repositories/leaderboardRepository.js` ends the query with `LIMIT 10;ff`. The extra `ff` produces a database syntax error on an uncached request. The frontend displays an error with retry until the backend query is corrected.
2. **Exercise schema/catalog:** repositories query an `exercises` table, but the checked-in `schema.sql` does not create or seed it, and no exercise-list API exists. An existing populated `exercises` table is required for workouts and leaderboards. Use actual database IDs or configure the optional frontend catalog above.
3. **PR edits:** `updateWorkoutService` calculates `is_pr`, but `updateWorkout` in the repository does not persist that field. Deleting a workout also does not recalculate historical PR flags. The frontend displays the flags returned by the backend; editing/deleting can leave record counts stale until backend behavior is corrected.
4. **Early PR notifications:** the service emits the personal-record notification before inserting the workout. The frontend reports save success only after the HTTP request succeeds, but the socket message itself may arrive even when a later database/cache operation fails.

The backend was not running during frontend verification. Browser tests cover the recorded HTTP contracts using fixtures and exercise real Socket.IO connections against a test-only server; they do not verify PostgreSQL or Redis integration.

## Checks

```sh
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm test
```

The Playwright suite starts isolated frontend and Socket.IO test servers on ports 4173 and 3101. It covers authentication and redirects, profile creation/update, workout create/edit/delete, input retention after failed writes, all API pages and local filtering, session expiry, live leaderboard refreshes, PR notifications, mobile layouts, and dialog focus. Fixtures are confined to `tests/` and are not bundled in the app.

Production output is written to `dist/`. `npm run preview` serves that build locally; API requests still require the configured backend origin or a reverse proxy.

## Structure

- `src/api/client.ts` — typed endpoint calls, bearer-token handling, and error translation.
- `src/types.ts` — backend request and response types.
- `src/context/` — authentication, shared profile/workout data, sockets, and notifications.
- `src/pages/` — route screens.
- `src/components/` — forms, dialogs, tables, navigation, and shared states.
- `src/config/exercises.ts` — optional catalog using existing database IDs.
- `src/index.css` — responsive visual system. Google Fonts are optional; system fallbacks work without external font access.
- `tests/` — browser fixtures and integration tests.
