import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { io as connectSocket } from "socket.io-client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Never load .env or infer test destinations from production configuration.
const databaseUrl = process.env.TEST_DATABASE_URL;
const redisUrl = process.env.TEST_REDIS_URL;
if (!databaseUrl || !redisUrl) {
    throw new Error("Set TEST_DATABASE_URL and TEST_REDIS_URL to dedicated test services; see tests/README.md");
}
if (!/^\/[a-zA-Z0-9_]+_test$/.test(new URL(databaseUrl).pathname)) {
    throw new Error("TEST_DATABASE_URL must name a dedicated database ending in _test");
}
if (!/^\/(?:[1-9]|1[0-5])$/.test(new URL(redisUrl).pathname)) {
    throw new Error("TEST_REDIS_URL must select a dedicated Redis database from 1 through 15");
}

const schema = `gymmatch_test_${randomUUID().replaceAll("-", "")}`;
const scopedUrl = new URL(databaseUrl);
scopedUrl.searchParams.set("options", `-c search_path=${schema},public`);
process.env.DATABASE_URL = scopedUrl.toString();
process.env.REDIS_URL = redisUrl;
process.env.JWT_SECRET = randomBytes(32).toString("hex");

const admin = new Pool({ connectionString: databaseUrl });
let pool, redis, http, sockets, origin, exercises, cacheKeys;
const clients = new Set();
const schemaSql = await readFile(new URL("../src/config/schema.sql", import.meta.url), "utf8");
const seedSql = await readFile(new URL("../src/config/seed.sql", import.meta.url), "utf8");
const migrationSql = await readFile(new URL("../src/config/migrations/001_exercises.sql", import.meta.url), "utf8");

before(async () => {
    await admin.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public');
    await admin.query(`CREATE SCHEMA ${schema}`);
    ({ default: pool } = await import("../src/config/db.js"));
    await pool.query(schemaSql);
    await pool.query(seedSql);
    exercises = Object.fromEntries((await pool.query("SELECT id, name FROM exercises")).rows.map(row => [row.name, row.id]));
    ({ default: redis } = await import("../src/config/redis.js"));
    assert.equal(await redis.dbSize(), 0, "Test Redis database must be empty and exclusively used by this suite");
    cacheKeys = Object.values(exercises).map(id => `leaderboard:exercise:${id}`);
    const { default: app } = await import("../src/app.js");
    const { initializeSockets } = await import("../src/socket.js");
    http = createServer(app);
    sockets = initializeSockets(http);
    await new Promise(resolve => http.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${http.address().port}`;
});

beforeEach(async () => {
    for (const socket of clients) socket.disconnect();
    clients.clear();
    if (!redis.isOpen) await redis.connect();
    await pool.query("TRUNCATE users CASCADE");
    await redis.del(cacheKeys);
});

after(async () => {
    for (const socket of clients) socket.disconnect();
    if (sockets) await new Promise(resolve => sockets.close(resolve));
    if (redis?.isOpen) {
        if (cacheKeys) await redis.del(cacheKeys);
        await redis.quit();
    }
    if (pool) await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
});

async function request(path, { method = "GET", token, body } = {}) {
    const response = await fetch(`${origin}/api${path}`, {
        method,
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(body !== undefined && { "Content-Type": "application/json" })
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(5000)
    });
    return { status: response.status, body: await response.json() };
}

async function account(name = "Test athlete") {
    const email = `${randomUUID()}@example.test`;
    const password = randomBytes(16).toString("hex");
    const signup = await request("/auth/signup", { method: "POST", body: { email, password } });
    assert.equal(signup.status, 201);
    const { user, token } = signup.body;
    const profile = await request("/profile", { method: "POST", token, body: { name } });
    assert.equal(profile.status, 201);
    return { user, token, email, password };
}

async function log(user, fields = {}) {
    const response = await request("/workouts", {
        method: "POST", token: user.token,
        body: { exercise_id: exercises["Bench Press"], weight: 50, reps: 5, sets: 3, ...fields }
    });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response.body.workout;
}

function board(user, id = exercises["Bench Press"]) {
    return request(`/leaderboard?exercise_id=${id}`, { token: user.token });
}

function waitEvent(socket, event) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { socket.off(event, handler); reject(new Error(`Timed out waiting for ${event}`)); }, 3000);
        function handler(value) { clearTimeout(timer); resolve(value); }
        socket.once(event, handler);
    });
}

async function openSocket(token) {
    const socket = connectSocket(origin, {
        autoConnect: false, auth: token === undefined ? {} : { token },
        transports: ["websocket"], reconnection: false
    });
    clients.add(socket);
    const connected = waitEvent(socket, "connect");
    socket.connect();
    await connected;
    return socket;
}

test("fresh schema and repeatable seeds provide a catalog and enforce exercise references", async () => {
    await pool.query(seedSql);
    assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM exercises")).rows[0].count, 6);
    const user = await account();
    await assert.rejects(pool.query("INSERT INTO workout_logs (user_id, exercise_id) VALUES ($1, $2)", [user.user.id, 999999]), { code: "23503" });
    const invalid = await request("/workouts", { method: "POST", token: user.token, body: { exercise_id: 999999 } });
    assert.equal(invalid.status, 400);
    assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM workout_logs")).rows[0].count, 0);
});

test("legacy migration refuses orphan IDs and preserves an existing catalog on retry", async () => {
    const legacySchema = `${schema}_legacy`;
    await admin.query(`CREATE SCHEMA ${legacySchema}`);
    const legacy = new Pool({ connectionString: databaseUrl, options: `-c search_path=${legacySchema},public`, max: 1 });
    try {
        await legacy.query("CREATE TABLE workout_logs (id SERIAL PRIMARY KEY, exercise_id INT NOT NULL); INSERT INTO workout_logs (exercise_id) VALUES (1)");
        await assert.rejects(legacy.query(migrationSql), /Orphan workout exercise IDs/);
        await legacy.query("ROLLBACK");
        await legacy.query("CREATE TABLE exercises (id SERIAL PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL); INSERT INTO exercises (id, name, type) VALUES (1, 'Existing exercise', 'strength')");
        await legacy.query(migrationSql);
        await legacy.query(migrationSql);
        await legacy.query(seedSql);
        assert.equal((await legacy.query("SELECT name FROM exercises WHERE id = 1")).rows[0].name, "Existing exercise");
        assert.equal((await legacy.query("SELECT COUNT(*)::int AS count FROM exercises")).rows[0].count, 7);
        await assert.rejects(legacy.query("INSERT INTO workout_logs (exercise_id) VALUES (999999)"), { code: "23503" });
    } finally {
        await legacy.end();
        await admin.query(`DROP SCHEMA ${legacySchema} CASCADE`);
    }
});

test("signup hashes passwords, omits hashes, and returns a usable JWT; login verifies credentials", async () => {
    const user = await account();
    assert.equal(user.user.password_hash, undefined);
    assert.equal(jwt.verify(user.token, process.env.JWT_SECRET).id, user.user.id);
    const stored = (await pool.query("SELECT password_hash FROM users WHERE id = $1", [user.user.id])).rows[0];
    assert.notEqual(stored.password_hash, user.password);
    assert.equal(await bcrypt.compare(user.password, stored.password_hash), true);
    const login = await request("/auth/login", { method: "POST", body: { email: user.email, password: user.password } });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.password_hash, undefined);
    assert.equal((await request("/workouts", { token: login.body.token })).status, 200);
    assert.equal((await request("/auth/login", { method: "POST", body: { email: user.email, password: "incorrect" } })).status, 400);
});

test("authentication rejects missing fields, duplicate accounts, and missing/invalid/expired JWTs", async () => {
    const user = await account();
    assert.equal((await request("/auth/signup", { method: "POST", body: {} })).status, 400);
    assert.equal((await request("/auth/signup", { method: "POST", body: { email: user.email, password: user.password } })).status, 400);
    const expired = jwt.sign({ id: user.user.id }, process.env.JWT_SECRET, { expiresIn: -1 });
    for (const token of [undefined, "invalid", expired]) {
        for (const path of ["/workouts", "/profile/me", `/leaderboard?exercise_id=${exercises["Bench Press"]}`]) {
            assert.equal((await request(path, { token })).status, 401);
        }
    }
});

test("workouts are persisted, joined to exercise metadata, paginated, and scoped to their owner", async () => {
    const alice = await account(), bob = await account();
    const first = await log(alice, { workout_date: "2026-01-01" });
    const second = await log(alice, { workout_date: "2026-01-02", notes: "Saved note" });
    await log(bob, { weight: 200 });
    const page = await request("/workouts?page=1&limit=1", { token: alice.token });
    assert.equal(page.status, 200);
    assert.equal(page.body.workouts.length, 1);
    assert.equal(page.body.workouts[0].id, second.id);
    assert.equal(page.body.workouts[0].exercise_name, "Bench Press");
    assert.equal(page.body.workouts[0].exercise_type, "strength");
    const next = await request("/workouts?page=2&limit=1", { token: alice.token });
    assert.equal(next.body.workouts[0].id, first.id);
    assert.equal((await request(`/profile/${alice.user.id}`, { token: bob.token })).status, 403);
});

test("owners can update and delete workouts", async () => {
    const user = await account();
    const workout = await log(user);
    const updated = await request(`/workouts/${workout.id}`, { method: "PUT", token: user.token, body: { weight: 60, notes: "Changed", reps: null } });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.workout.weight, 60);
    assert.equal(updated.body.workout.reps, null);
    assert.equal(updated.body.workout.notes, "Changed");
    assert.equal((await request(`/workouts/${workout.id}`, { method: "DELETE", token: user.token })).status, 200);
    assert.equal((await request("/workouts", { token: user.token })).body.workouts.length, 0);
});

test("cross-user updates/deletes fail without changing workouts, PR flags, or caches", async () => {
    const alice = await account(), bob = await account();
    const workout = await log(alice);
    await board(alice);
    const key = `leaderboard:exercise:${workout.exercise_id}`;
    const cached = await redis.get(key);
    for (const method of ["PUT", "DELETE"]) {
        const response = await request(`/workouts/${workout.id}`, { method, token: bob.token, ...(method === "PUT" && { body: { weight: 999 } }) });
        assert.equal(response.status, 400);
        assert.match(response.body.error, /not found or unauthorized/i);
    }
    const stored = (await pool.query("SELECT * FROM workout_logs WHERE id = $1", [workout.id])).rows[0];
    assert.equal(stored.weight, 50);
    assert.equal(stored.is_pr, true);
    assert.equal(await redis.get(key), cached);
});

test("PRs require a strict strength weight improvement; null weights and cardio are never PRs", async () => {
    const user = await account();
    const records = [];
    for (const weight of [50, 50, 40, 60, null]) records.push(await log(user, { weight }));
    assert.deepEqual(records.map(w => w.is_pr), [true, false, false, true, false]);
    const cardio = await log(user, { exercise_id: exercises.Running, weight: 100, duration_minutes: 20 });
    assert.equal(cardio.is_pr, false);
});

test("editing earlier entries recalculates persisted PR flags; unrelated edits preserve them", async () => {
    const user = await account();
    const first = await log(user, { weight: 50 });
    const later = await log(user, { weight: 60 });
    const response = await request(`/workouts/${first.id}`, { method: "PUT", token: user.token, body: { weight: 70 } });
    assert.equal(response.status, 200);
    assert.equal(response.body.workout.is_pr, true);
    assert.equal((await pool.query("SELECT is_pr FROM workout_logs WHERE id = $1", [later.id])).rows[0].is_pr, false);
    const note = await request(`/workouts/${later.id}`, { method: "PUT", token: user.token, body: { notes: "No PR change" } });
    assert.equal(note.body.workout.is_pr, false);
    await request(`/workouts/${first.id}`, { method: "PUT", token: user.token, body: { weight: null } });
    assert.equal((await pool.query("SELECT is_pr FROM workout_logs WHERE id = $1", [later.id])).rows[0].is_pr, true);
});

test("deleting an earlier record recalculates the remaining history", async () => {
    const user = await account();
    const first = await log(user, { weight: 100 });
    const later = await log(user, { weight: 80 });
    assert.equal(later.is_pr, false);
    await request(`/workouts/${first.id}`, { method: "DELETE", token: user.token });
    assert.equal((await pool.query("SELECT is_pr FROM workout_logs WHERE id = $1", [later.id])).rows[0].is_pr, true);
});

test("concurrent equal-weight submissions produce exactly one record flag", async () => {
    const user = await account();
    const results = await Promise.all([log(user, { weight: 100 }), log(user, { weight: 100 })]);
    assert.equal(results.filter(w => w.is_pr).length, 1);
    const rows = (await pool.query("SELECT is_pr FROM workout_logs")).rows;
    assert.equal(rows.filter(w => w.is_pr).length, 1);
});

test("leaderboard executes real aggregation, sorts maxima, excludes users without profiles, and limits to ten", async () => {
    const viewer = await account("Viewer");
    // SQL fixtures keep bcrypt unrelated to this aggregation test.
    for (let i = 0; i < 12; i++) {
        const id = randomUUID();
        await pool.query("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)", [id, `${id}@example.test`, "fixture-not-a-password"]);
        await pool.query("INSERT INTO profiles (user_id, name) VALUES ($1, $2)", [id, `Athlete ${i}`]);
        await pool.query("INSERT INTO workout_logs (user_id, exercise_id, weight) VALUES ($1, $2, $3), ($1, $2, $4)", [id, exercises["Bench Press"], i + 20, i + 10]);
    }
    const hiddenId = randomUUID();
    await pool.query("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)", [hiddenId, `${hiddenId}@example.test`, "fixture-not-a-password"]);
    await pool.query("INSERT INTO workout_logs (user_id, exercise_id, weight) VALUES ($1, $2, 999)", [hiddenId, exercises["Bench Press"]]);
    const response = await board(viewer);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.leaderboard.map(row => row.max_weight), [31, 30, 29, 28, 27, 26, 25, 24, 23, 22]);
    assert.equal((await request("/leaderboard?exercise_id=invalid", { token: viewer.token })).status, 400);
});

test("leaderboard cache miss fills Redis with a 60-second TTL and a subsequent read uses it", async () => {
    const user = await account();
    const workout = await log(user);
    const key = `leaderboard:exercise:${workout.exercise_id}`;
    assert.equal(await redis.get(key), null);
    const first = await board(user);
    assert.equal(first.status, 200);
    assert.deepEqual(JSON.parse(await redis.get(key)), first.body);
    const ttl = await redis.ttl(key);
    assert.ok(ttl > 0 && ttl <= 60);
    await pool.query("UPDATE workout_logs SET weight = 99 WHERE id = $1", [workout.id]);
    assert.deepEqual((await board(user)).body, first.body);
    await redis.del(key);
    assert.equal((await board(user)).body.leaderboard[0].max_weight, 99);
});

test("create, update, and delete invalidate cached rankings", async () => {
    const user = await account();
    await board(user);
    const key = `leaderboard:exercise:${exercises["Bench Press"]}`;
    const workout = await log(user);
    assert.equal(await redis.get(key), null);
    assert.equal((await board(user)).body.leaderboard[0].max_weight, 50);
    await request(`/workouts/${workout.id}`, { method: "PUT", token: user.token, body: { weight: 80 } });
    assert.equal(await redis.get(key), null);
    assert.equal((await board(user)).body.leaderboard[0].max_weight, 80);
    await request(`/workouts/${workout.id}`, { method: "DELETE", token: user.token });
    assert.equal(await redis.get(key), null);
    assert.deepEqual((await board(user)).body.leaderboard, []);
});

test("moving a workout invalidates both exercise caches and refreshes both PR histories", async () => {
    const user = await account();
    const original = await log(user, { weight: 100 });
    const later = await log(user, { weight: 90 });
    const target = exercises.Squat;
    await log(user, { exercise_id: target, weight: 95 });
    await board(user); await board(user, target);
    const socket = await openSocket(user.token);
    for (const id of [original.exercise_id, target]) await socket.timeout(2000).emitWithAck("join_exercise", id);
    const events = [];
    socket.on("leaderboard_update", event => events.push(event.exercise_id));
    const moved = await request(`/workouts/${original.id}`, { method: "PUT", token: user.token, body: { exercise_id: target } });
    assert.equal(moved.status, 200);
    assert.equal(moved.body.workout.weight, 100);
    assert.equal(moved.body.workout.is_pr, true);
    for (const id of [original.exercise_id, target]) assert.equal(await redis.get(`leaderboard:exercise:${id}`), null);
    const remaining = (await pool.query("SELECT is_pr FROM workout_logs WHERE id = $1", [later.id])).rows[0];
    assert.equal(remaining.is_pr, true);
    await delay(100);
    assert.deepEqual(events.sort(), [original.exercise_id, target].sort());
});

test("failed inserts/updates roll back without changing cache, PRs, or emitting events", async () => {
    const user = await account();
    const existing = await log(user);
    await board(user);
    const key = `leaderboard:exercise:${existing.exercise_id}`;
    const cached = await redis.get(key);
    const socket = await openSocket(user.token);
    await socket.timeout(2000).emitWithAck("join_exercise", existing.exercise_id);
    const events = [];
    socket.on("notification", value => events.push(value));
    socket.on("leaderboard_update", value => events.push(value));
    const invalid = { weight: 200, workout_date: "invalid-date" };
    assert.equal((await request("/workouts", { method: "POST", token: user.token, body: { exercise_id: existing.exercise_id, ...invalid } })).status, 400);
    assert.equal((await request(`/workouts/${existing.id}`, { method: "PUT", token: user.token, body: invalid })).status, 400);
    await delay(100);
    assert.deepEqual(events, []);
    const rows = (await pool.query("SELECT weight, is_pr FROM workout_logs")).rows;
    assert.deepEqual(rows, [{ weight: 50, is_pr: true }]);
    assert.equal(await redis.get(key), cached);
});

test("cache connection loss does not turn committed workouts into HTTP failures; reads fall back to PostgreSQL", async () => {
    const user = await account();
    redis.destroy(); // Close the actual application's Redis connection; no stub.
    try {
        const workout = await log(user);
        const response = await board(user);
        assert.equal(response.status, 200);
        assert.equal(response.body.leaderboard[0].max_weight, workout.weight);
        assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM workout_logs")).rows[0].count, 1);
    } finally {
        await redis.connect();
    }
});

test("Socket.IO rejects missing, malformed, expired, and wrongly signed login tokens", async () => {
    const user = await account();
    const tokens = [undefined, "invalid", jwt.sign({ id: user.user.id }, process.env.JWT_SECRET, { expiresIn: -1 }), jwt.sign({ id: user.user.id }, randomBytes(32).toString("hex"), { expiresIn: "1h" })];
    for (const token of tokens) {
        const socket = connectSocket(origin, { autoConnect: false, auth: { token }, reconnection: false, transports: ["websocket"] });
        clients.add(socket);
        const error = waitEvent(socket, "connect_error");
        socket.connect();
        assert.equal((await error).message, "Unauthorized");
        assert.equal(socket.connected, false);
        socket.disconnect();
    }
});

test("socket registration cannot impersonate another user; PRs arrive after commit on all owner connections", async () => {
    const alice = await account(), bob = await account();
    const owner = await openSocket(alice.token), secondTab = await openSocket(alice.token), attacker = await openSocket(bob.token);
    assert.deepEqual(await owner.timeout(2000).emitWithAck("register_user", alice.user.id), { ok: true });
    assert.deepEqual(await attacker.timeout(2000).emitWithAck("register_user", alice.user.id), { error: "Unauthorized" });
    assert.deepEqual(await owner.timeout(2000).emitWithAck("join_exercise", "invalid"), { error: "Invalid exercise_id" });
    const stolen = [];
    attacker.on("notification", event => stolen.push(event));
    const notification = waitEvent(owner, "notification");
    const otherNotification = waitEvent(secondTab, "notification");
    // Query as soon as the event arrives, before waiting for the HTTP response.
    const committed = notification.then(() => pool.query("SELECT weight FROM workout_logs WHERE user_id = $1", [alice.user.id]));
    const workout = await log(alice, { weight: 70 });
    assert.equal((await notification).exercise_id, workout.exercise_id);
    assert.equal((await otherNotification).exercise_id, workout.exercise_id);
    assert.equal((await committed).rows[0].weight, 70);
    await delay(100);
    assert.deepEqual(stolen, []);
});

test("exercise room events are delivered only to subscribers", async () => {
    const user = await account();
    const subscribed = await openSocket(user.token), other = await openSocket(user.token);
    await subscribed.timeout(2000).emitWithAck("join_exercise", exercises["Bench Press"]);
    await other.timeout(2000).emitWithAck("join_exercise", exercises.Squat);
    const unrelated = [];
    other.on("leaderboard_update", event => unrelated.push(event));
    const event = waitEvent(subscribed, "leaderboard_update");
    await log(user);
    assert.equal((await event).exercise_id, exercises["Bench Press"]);
    await delay(100);
    assert.deepEqual(unrelated, []);
});

test("authenticated sockets disconnect when their JWT expires", async () => {
    const user = await account();
    const token = jwt.sign({ id: user.user.id }, process.env.JWT_SECRET, { expiresIn: 2 });
    const socket = await openSocket(token);
    await waitEvent(socket, "disconnect");
    assert.equal(socket.connected, false);
});
