import { test, expect, type Page } from "@playwright/test";
import type { Profile, Session, Workout } from "../src/types";

const session: Session = {
  user: { id: "athlete-1", email: "alex@example.com" },
  token: "test-token",
};
const profile: Profile = {
  id: "profile-1",
  user_id: "athlete-1",
  name: "Alex Morgan",
  age: 28,
  gender: "Woman",
  location_city: "New York",
  gym_name: "The Training Room",
  fitness_goal: "Build strength",
  experience_level: "Intermediate",
  preferred_time_slot: "Morning",
  workout_preference: "Strength training",
  created_at: "2026-01-01T12:00:00Z",
  updated_at: "2026-01-01T12:00:00Z",
};
function dateAgo(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function entry(index: number): Workout {
  return {
    id: `workout-${index}`,
    user_id: "athlete-1",
    exercise_id: (index % 3) + 1,
    exercise_name: ["Bench press", "Barbell squat", "Deadlift"][index % 3],
    exercise_type: "strength",
    weight: [65, 100, 120][index % 3],
    reps: 8,
    sets: 3,
    duration_minutes: 35,
    rest_time: 90,
    notes: null,
    is_pr: index % 4 === 0,
    workout_date: dateAgo(index % 7),
    created_at: "2026-01-01T12:00:00Z",
    updated_at: "2026-01-01T12:00:00Z",
  };
}
async function setup(
  page: Page,
  options: { signedIn?: boolean; hasProfile?: boolean; count?: number } = {},
) {
  const state = {
    profile:
      options.hasProfile === false ? (null as Profile | null) : { ...profile },
    workouts: Array.from({ length: options.count ?? 5 }, (_, index) =>
      entry(index),
    ),
    leaderboard: [
      {
        user_id: "athlete-2",
        name: "Sam Rivera",
        location_city: "Boston",
        exercise_name: "Bench press",
        max_weight: 100,
      },
      {
        user_id: "athlete-1",
        name: "Alex Morgan",
        location_city: "New York",
        exercise_name: "Bench press",
        max_weight: 65,
      },
    ],
    calls: [] as {
      method: string;
      path: string;
      body: Record<string, unknown> | null;
      authorization: string | undefined;
    }[],
    pages: [] as number[],
  };
  if (options.signedIn !== false)
    await page.addInitScript(
      (value) =>
        localStorage.setItem("gymmatch.session", JSON.stringify(value)),
      session,
    );
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const method = req.method();
      const body = req.postDataJSON();
      state.calls.push({
        method,
        path: url.pathname,
        body,
        authorization: req.headers().authorization,
      });
      const reply = (data: unknown, status = 200) =>
        route.fulfill({ status, json: data });
      if (url.pathname.startsWith("/api/auth/"))
        return reply(session, url.pathname.endsWith("signup") ? 201 : 200);
      if (url.pathname === "/api/profile/me" && method === "GET")
        return state.profile
          ? reply({ profile: state.profile })
          : reply(
              { error: "Profile not found. Please create one first." },
              400,
            );
      if (
        url.pathname.startsWith("/api/profile") &&
        (method === "POST" || method === "PUT")
      ) {
        state.profile = {
          ...profile,
          ...body,
          updated_at: new Date().toISOString(),
        };
        return reply({ profile: state.profile }, method === "POST" ? 201 : 200);
      }
      if (url.pathname === "/api/workouts" && method === "GET") {
        const current = Number(url.searchParams.get("page") || 1);
        const limit = Number(url.searchParams.get("limit") || 10);
        state.pages.push(current);
        return reply({
          workouts: state.workouts.slice(
            (current - 1) * limit,
            current * limit,
          ),
        });
      }
      if (url.pathname === "/api/workouts" && method === "POST") {
        const workout = {
          ...entry(0),
          ...body,
          id: `new-${state.workouts.length}`,
          is_pr: true,
        };
        state.workouts.unshift(workout);
        return reply({ message: "Workout created successfully", workout }, 201);
      }
      if (url.pathname.startsWith("/api/workouts/") && method === "PUT") {
        const id = url.pathname.split("/").at(-1);
        state.workouts = state.workouts.map((workout) =>
          workout.id === id ? { ...workout, ...body } : workout,
        );
        return reply({
          message: "Workout updated successfully",
          workout: state.workouts.find((workout) => workout.id === id),
        });
      }
      if (url.pathname.startsWith("/api/workouts/") && method === "DELETE") {
        state.workouts = state.workouts.filter(
          (workout) => workout.id !== url.pathname.split("/").at(-1),
        );
        return reply({ message: "Workout deleted successfully" });
      }
      if (url.pathname === "/api/leaderboard")
        return reply({ leaderboard: state.leaderboard });
      return reply({ error: "Unexpected API call" }, 404);
    },
  );
  return state;
}

test("protected routes preserve destination and login sends the correct contract", async ({
  page,
}) => {
  const state = await setup(page, { signedIn: false });
  await page.goto("/workouts");
  await expect(page).toHaveURL(/\/login$/);
  await page.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Email address").fill("alex@example.com");
  await page.getByLabel("Password", { exact: true }).fill("secret-password");
  await page.getByRole("button", { name: "Let’s get moving" }).click();
  await expect(page).toHaveURL(/\/workouts$/);
  await expect(
    page.getByRole("heading", { name: "Every workout counts." }),
  ).toBeVisible();
  expect(
    state.calls.find((call) => call.path === "/api/auth/login")?.body,
  ).toEqual({ email: "alex@example.com", password: "secret-password" });
  expect(
    state.calls.find((call) => call.path === "/api/workouts")?.authorization,
  ).toBe("Bearer test-token");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() => localStorage.getItem("gymmatch.session")),
  ).toBeNull();
});

test("signup automatically signs in and creates then updates a profile", async ({
  page,
}) => {
  const state = await setup(page, {
    signedIn: false,
    hasProfile: false,
    count: 0,
  });
  await page.goto("/signup");
  await page.getByLabel("Email address").fill("alex@example.com");
  await page.getByLabel("Password", { exact: true }).fill("secret-password");
  await page.getByLabel("Confirm password").fill("different-password");
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page.getByRole("alert")).toContainText("passwords don’t match");
  expect(
    state.calls.filter((call) => call.path.startsWith("/api/auth")),
  ).toHaveLength(0);
  await page.getByLabel("Confirm password").fill("secret-password");
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.getByLabel("Full name").fill("Alex Morgan");
  await page.getByLabel("Age", { exact: true }).fill("28");
  await page.getByLabel("City", { exact: true }).fill("New York");
  await page.getByRole("button", { name: "Create my profile" }).click();
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeVisible();
  expect(
    state.calls.find(
      (call) => call.method === "POST" && call.path === "/api/profile",
    )?.body,
  ).toMatchObject({
    name: "Alex Morgan",
    age: 28,
    location_city: "New York",
    gender: null,
  });
  await page.getByLabel("Fitness goal").fill("Build strength");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Profile updated" }),
  ).toBeVisible();
  expect(
    state.calls.some(
      (call) => call.method === "PUT" && call.path === "/api/profile/me",
    ),
  ).toBe(true);
});

test("dashboard derives actual statistics and renders on mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setup(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Let’s go, Alex." }),
  ).toBeVisible();
  await expect(
    page.locator(".stat-card").first().locator(".stat-value"),
  ).toHaveText("5");
  await expect(
    page.locator(".stat-card").nth(1).locator(".stat-value"),
  ).toHaveText("10,800kg");
  await expect(page.getByText("Live updates on")).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "My workouts", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Every workout counts." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("workout creation, editing, clearing fields, and deletion use existing endpoints", async ({
  page,
}) => {
  const state = await setup(page, { count: 0 });
  await page.goto("/workouts");
  await expect(page.getByText("The first one is a fresh start.")).toBeVisible();
  await page.getByRole("link", { name: "Log a workout" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Exercise ID").fill("1");
  await dialog.getByLabel("Weight (kg)").fill("75");
  await dialog.getByLabel("Sets", { exact: true }).fill("3");
  await dialog.getByLabel("Reps per set").fill("8");
  await dialog.getByLabel("Duration (minutes)").fill("30");
  await dialog.getByLabel("Rest between sets").fill("90");
  await dialog.getByLabel("Notes").fill("Felt strong");
  await dialog.getByRole("button", { name: "Save workout" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("cell", { name: /^Bench press/ })).toBeVisible();
  expect(
    state.calls.find(
      (call) => call.method === "POST" && call.path === "/api/workouts",
    )?.body,
  ).toMatchObject({
    exercise_id: 1,
    weight: 75,
    reps: 8,
    sets: 3,
    duration_minutes: 30,
    rest_time: 90,
    notes: "Felt strong",
  });
  await page.getByRole("button", { name: "Edit Bench press" }).click();
  await dialog.getByLabel("Weight (kg)").fill("80");
  await dialog.getByLabel("Notes").fill("");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("cell", { name: /80 kg/ })).toBeVisible();
  expect(
    state.calls.find((call) => call.method === "PUT")?.body?.notes,
  ).toBeNull();
  await page.getByRole("button", { name: "Delete Bench press" }).click();
  await dialog.getByRole("button", { name: "Keep workout" }).click();
  expect(state.calls.filter((call) => call.method === "DELETE")).toHaveLength(
    0,
  );
  await page.getByRole("button", { name: "Delete Bench press" }).click();
  await dialog.getByRole("button", { name: "Delete workout" }).click();
  await expect(page.getByText("The first one is a fresh start.")).toBeVisible();
  expect(state.workouts).toHaveLength(0);
});

test("loads every API page, paginates locally, filters and accepts an unknown exercise ID", async ({
  page,
}) => {
  const state = await setup(page, { count: 105 });
  await page.goto("/workouts");
  await expect(page.getByText("Showing 1–10 of 105 entries")).toBeVisible();
  expect(state.pages).toContain(2);
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Showing 11–20 of 105 entries")).toBeVisible();
  await page.getByLabel("Search workouts").fill("Deadlift");
  await expect(page.getByText("Showing 1–10 of 35 entries")).toBeVisible();
  await page.getByRole("button", { name: "Cardio", exact: true }).click();
  await expect(page.getByText("No workouts found.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("link", { name: "Log a workout" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Exercise ID")
    .pressSequentially("12");
  await expect(page.getByRole("dialog").getByLabel("Exercise ID")).toHaveValue(
    "12",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("leaderboard refreshes on its room event and receives personal-record notifications", async ({
  page,
  request,
}) => {
  const state = await setup(page);
  await page.goto("/leaderboard?exercise=1");
  await expect(page.getByRole("cell", { name: "Sam Rivera" })).toBeVisible();
  await expect(page.getByText("Your rank: #2")).toBeVisible();
  await expect(page.getByText("Updating live", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/leaderboard-desktop.png",
    fullPage: true,
  });
  state.leaderboard[0].max_weight = 110;
  await request.post("http://127.0.0.1:3101/emit", {
    data: {
      room: "exercise:1",
      event: "leaderboard_update",
      payload: { exercise_id: "1" },
    },
  });
  await expect(page.getByRole("cell", { name: "110 kg" })).toBeVisible();
  await request.post("http://127.0.0.1:3101/emit", {
    data: {
      room: "user:athlete-1",
      event: "notification",
      payload: { message: "New PR! You Lifted 80 kg", exercise_id: 1 },
    },
  });
  await expect(
    page.getByRole("status").filter({ hasText: "New PR! You Lifted 80 kg" }),
  ).toBeVisible();
});

test("leaderboard backend failure is an actionable error, not empty or invented data", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/leaderboard?**", (route) =>
    route.fulfill({
      status: 500,
      json: { error: "syntax error at or near ff" },
    }),
  );
  await page.goto("/leaderboard?exercise=1");
  await expect(page.getByRole("alert")).toContainText(
    "GymMatch couldn’t load this right now",
  );
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByText("syntax error")).not.toBeVisible();
});

test("expired sessions are cleared and redirected to sign in", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/profile/me", (route) =>
    route.fulfill({ status: 401, json: { error: "Invalid or expired token" } }),
  );
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("status")).toContainText(
    "Your session has expired",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("gymmatch.session")),
  ).toBeNull();
});

test("failed writes keep form data and never report success", async ({
  page,
}) => {
  await setup(page, { count: 0 });
  await page.route("**/api/workouts", async (route) => {
    if (route.request().method() === "POST")
      await route.fulfill({
        status: 400,
        json: { error: "Invalid exercise_id" },
      });
    else await route.fallback();
  });
  await page.goto("/workouts?new=1");
  await page.getByLabel("Exercise ID").fill("999");
  await page.getByLabel("Notes").fill("Keep my notes");
  await page.getByRole("button", { name: "Save workout" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Invalid exercise_id",
  );
  await expect(page.getByLabel("Notes")).toHaveValue("Keep my notes");
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("all pages fit a narrow phone viewport and the dialog keeps keyboard focus", async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 360, height: 800 });
  for (const route of ["/workouts", "/profile", "/leaderboard?exercise=1"]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator(".loading-state")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/workouts?new=1");
  await expect(page.getByRole("dialog")).toBeVisible();
  for (let index = 0; index < 16; index++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest("dialog")),
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/workout-dialog-mobile.png",
    fullPage: true,
  });
});
