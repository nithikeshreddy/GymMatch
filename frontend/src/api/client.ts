import axios from "axios";
import { readSession, SESSION_EXPIRED } from "../lib/session";
import type {
  LeaderboardEntry,
  Profile,
  ProfileInput,
  Session,
  Workout,
  WorkoutInput,
} from "../types";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const session = readSession();
  if (session && !config.url?.startsWith("/auth/")) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config?.headers.Authorization === `Bearer ${readSession()?.token}`
    ) {
      window.dispatchEvent(new Event(SESSION_EXPIRED));
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    if (error.response?.status === 401)
      return "Your session has expired. Please sign in again.";
    if (!error.response || error.code === "ECONNABORTED")
      return "We couldn’t reach GymMatch. Check your connection and try again.";
    if (error.response.status >= 500)
      return "GymMatch couldn’t load this right now. Please try again in a moment.";
    const message = error.response.data?.error;
    if (
      message &&
      !/syntax|relation|column|constraint|invalid input|query|database/i.test(
        message,
      )
    )
      return message;
  }
  return "Something went wrong. Please try again.";
}

export const gymApi = {
  async authenticate(
    mode: "login" | "signup",
    email: string,
    password: string,
  ) {
    return (await api.post<Session>(`/auth/${mode}`, { email, password })).data;
  },
  async profile(signal?: AbortSignal): Promise<Profile | null> {
    try {
      return (await api.get<{ profile: Profile }>("/profile/me", { signal }))
        .data.profile;
    } catch (error) {
      if (
        axios.isAxiosError<{ error: string }>(error) &&
        error.response?.status === 400 &&
        error.response.data.error ===
          "Profile not found. Please create one first."
      )
        return null;
      throw error;
    }
  },
  async saveProfile(input: ProfileInput, exists: boolean) {
    const result = exists
      ? await api.put<{ profile: Profile }>("/profile/me", input)
      : await api.post<{ profile: Profile }>("/profile", input);
    return result.data.profile;
  },
  async workouts(signal?: AbortSignal) {
    const collected = new Map<string, Workout>();
    // The API has no total count. A short page marks the end of the history.
    for (let page = 1; ; page++) {
      const { data } = await api.get<{ workouts: Workout[] }>("/workouts", {
        params: { page, limit: 100 },
        signal,
      });
      for (const workout of data.workouts) collected.set(workout.id, workout);
      if (data.workouts.length < 100) return [...collected.values()];
    }
  },
  async saveWorkout(input: WorkoutInput, id?: string) {
    const result = id
      ? await api.put<{ workout: Workout }>(
          `/workouts/${encodeURIComponent(id)}`,
          input,
        )
      : await api.post<{ workout: Workout }>("/workouts", input);
    return result.data.workout;
  },
  async deleteWorkout(id: string) {
    await api.delete(`/workouts/${encodeURIComponent(id)}`);
  },
  async leaderboard(exerciseId: number, signal?: AbortSignal) {
    return (
      await api.get<{ leaderboard: LeaderboardEntry[] }>("/leaderboard", {
        params: { exercise_id: exerciseId },
        signal,
      })
    ).data.leaderboard;
  },
};
