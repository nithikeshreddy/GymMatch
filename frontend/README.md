# GymMatch frontend

React and TypeScript client for the GymMatch API. See the [root README](../README.md) for the product overview, architecture, complete API reference, local backend/database/Redis setup, and known backend limitations.

## Local development

From the repository root:

```sh
npm ci --prefix frontend
cp -n frontend/.env.example frontend/.env.local
cd frontend
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. The existing API and Redis must be running for account and workout requests. `BACKEND_URL` controls the development proxy for both `/api` and `/socket.io`.

The [environment template](.env.example) contains public local defaults. Never place credentials in `VITE_*` variables: they are exposed to the browser. API and Socket.IO URL behavior is documented in the [environment reference](../README.md#environment-variables).

## Screens and data flow

| Route               | Behavior                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `/login`, `/signup` | Email/password forms, session persistence, destination restoration, and signup-to-profile navigation |
| `/`                 | Workout counts, lifted volume, backend PR flags, seven-day activity, and recent entries              |
| `/workouts`         | Create, edit, and delete workouts; local search, filters, date sorting, and pagination               |
| `/leaderboard`      | Exercise selection, top-10 rankings, current-user highlighting, and event-driven refresh             |
| `/profile`          | Profile creation and editing with all implemented backend fields                                     |

- `AuthProvider` stores the returned session, synchronizes changes between browser tabs, and clears it after HTTP 401 responses.
- `GymProvider` shares profile/workout data and owns the Socket.IO connection, supplying the current login JWT in the handshake. The leaderboard subscribes to exercise rooms; PR notifications appear as toasts.
- `useResource` aborts superseded requests and provides loading, error, and retry state.
- The history loader requests pages of 100 until a short page is returned. Dashboard totals and search therefore cover all loaded history; displayed workout pages contain 10 rows. Large histories would benefit from server-side aggregates and filtering.
- Workout fields use the backend's integer representation. Optional cleared fields are sent as `null`. Failed saves preserve form input.
- Responsive navigation and dialogs support keyboard use, focus management, and reduced-motion preferences.

## Exercise selection

The backend currently has no exercise-list endpoint.

Exercises from workout history populate the picker using their returned IDs and names. For a first workout, enter an existing database exercise ID. To show names before a user has history, populate [src/config/exercises.ts](src/config/exercises.ts) with exact `{ id, name, type }` values from your own database. This configuration does not create exercise records.

The backend includes a repeatable starter exercise seed; query its IDs as described in the [root setup instructions](../README.md#getting-started). Remaining deployment and consistency limitations are tracked in the [root README](../README.md#current-limitations--future-improvements).

## Checks

Run from `frontend/`:

```sh
npm run typecheck
npm run lint
npm run format:check
npm run build
npx playwright install chromium
npm test
```

The 10 browser tests in [tests/app.spec.ts](tests/app.spec.ts) use HTTP fixtures and a real Socket.IO connection to a test-only server. They start Vite on port `4173` and the socket fixture on `3101`; neither PostgreSQL nor Redis is required. They do not exercise the production backend. Generated screenshots and failure traces stay in ignored `test-results/`.

`npm run format` formats frontend source and test files. `npm run test:ui` opens Playwright's interactive test interface.

## Build and hosting

`npm run build` runs TypeScript checking and generates `dist/`. `npm run preview` serves those assets for local inspection and inherits Vite's configured API/Socket.IO proxy. That local proxy is not part of the generated static assets.

Hosting needs a fallback to `index.html` for client routes and either a reverse proxy for `/api` and `/socket.io` (including WebSocket upgrades), or public build-time `VITE_API_URL` and `VITE_SOCKET_URL` values. The repository has no production hosting configuration.

## Source layout

- `src/api/` and `src/types.ts`: endpoint calls, error translation, and request/response types.
- `src/context/`: authentication, shared data, sockets, and notifications.
- `src/pages/` and `src/components/`: route screens and reusable interface elements.
- `src/hooks/` and `src/lib/`: resource loading, session storage, and formatting.
- `src/index.css`: responsive styling; Google Fonts have system-font fallbacks.
- `tests/`: browser fixtures and scenarios; excluded from the application bundle.
