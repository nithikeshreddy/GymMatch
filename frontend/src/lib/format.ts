import type { Workout } from "../types";

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function workoutDate(value: string | null | undefined) {
  // PostgreSQL DATE may be serialized as either YYYY-MM-DD or an ISO timestamp.
  return value?.slice(0, 10) || "";
}
export function formatDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
) {
  const date = workoutDate(value);
  if (!date) return "No date";
  return new Date(`${date}T12:00:00`).toLocaleDateString(
    "en-US",
    options || { month: "short", day: "numeric", year: "numeric" },
  );
}
export const number = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
export const initials = (name: string) =>
  name
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
export const exerciseName = (workout: Workout) =>
  workout.exercise_name || `Exercise #${workout.exercise_id}`;
export const volume = (workout: Workout) =>
  (workout.weight || 0) * (workout.reps || 0) * (workout.sets || 0);
