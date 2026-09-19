# Backend integration tests

`npm test` runs Node.js's built-in test runner against the actual Express routes, PostgreSQL repositories, Redis client, and authenticated Socket.IO server. There are no mock database/cache services. The suite applies the checked-in schema and seed, uses HTTP on an ephemeral local port, and generates a new JWT signing key in memory for each run.

## Local services

Use Node.js 24 and **dedicated, disposable** PostgreSQL 16+ and Redis 7+ instances. For example, with Docker installed and running:

```sh
docker run --rm -d --name gymmatch-test-postgres -p 127.0.0.1:55432:5432 -e POSTGRES_USER=gymmatch_test -e POSTGRES_DB=gymmatch_test -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16
docker run --rm -d --name gymmatch-test-redis -p 127.0.0.1:56379:6379 redis:7
docker exec gymmatch-test-postgres pg_isready -U gymmatch_test -d gymmatch_test
docker exec gymmatch-test-redis redis-cli ping
```

Wait for both readiness checks to succeed. Trust authentication is only for this disposable local test service bound to loopback, never deployment. Existing native PostgreSQL/Redis installations also work when provisioned with equivalent dedicated endpoints. Local verification used disposable native services; the Docker convenience commands have not been run locally. CI uses real service containers.

From the repository root:

```sh
npm ci --prefix backend
npm run check --prefix backend
TEST_DATABASE_URL=postgresql://gymmatch_test@127.0.0.1:55432/gymmatch_test TEST_REDIS_URL=redis://127.0.0.1:56379/15 npm test --prefix backend
```

Stop only those test containers when finished:

```sh
docker stop gymmatch-test-postgres gymmatch-test-redis
```

The suite refuses a database name that does not end in `_test`, a Redis URL without a nonzero database number, or a nonempty Redis test database. It does not read `backend/.env`. It creates a unique PostgreSQL schema and removes that schema afterward; per-test cleanup truncates only its own tables and deletes only its exercise cache keys. The PostgreSQL role needs schema/extension privileges. Never run two suites against the same Redis database, or point these variables at application data.

## Coverage and boundaries

- Schema/seed initialization, repeatable seeds, exercise foreign keys, and a safe legacy migration.
- Signup/login, password hashing, response sanitization, HTTP JWT rejection, and profile privacy.
- Workout persistence, joined history, pagination, and update/delete ownership.
- PR ties, null weights, cardio, edits, deletions, exercise changes, and concurrent writes.
- Leaderboard aggregation/top ten, cache hits/misses/TTL, and mutation invalidation.
- Real Redis connection loss: committed writes stay successful and ranking reads fall back to SQL.
- Socket JWT rejection/expiry, identity spoof prevention, multiple owner connections, scoped exercise events, and notifications only after persistence.

The suite is in `integration.test.js`. `npm run check` checks JavaScript syntax in source, tests, scripts, and the manual socket helper; it is not a linter or type checker. Frontend Playwright tests remain a separate suite with HTTP fixtures.

The tests are correctness checks, not load tests or performance benchmarks. Database/cache operations span separate systems; failed invalidation or a concurrent cache fill can leave an existing entry stale until its 60-second TTL. Redis must be reachable at application startup.
