import {
  ArrowUpRight,
  Dumbbell,
  Pencil,
  Timer,
  Trash2,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { exerciseName, formatDate } from "../lib/format";
import type { Workout } from "../types";

export function WorkoutTable({
  workouts,
  onEdit,
  onDelete,
}: {
  workouts: Workout[];
  onEdit?: (workout: Workout) => void;
  onDelete?: (workout: Workout) => void;
}) {
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label="Workout history"
      tabIndex={0}
    >
      <table className="workout-table">
        <thead>
          <tr>
            <th>EXERCISE</th>
            <th>DATE</th>
            <th>SETS × REPS</th>
            <th>WEIGHT / TIME</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {workouts.map((workout) => (
            <tr key={workout.id}>
              <td>
                <div className="exercise-cell">
                  <span
                    className={`exercise-icon ${workout.exercise_type === "cardio" ? "exercise-cardio" : ""}`}
                  >
                    {workout.exercise_type === "cardio" ? (
                      <Timer size={19} />
                    ) : (
                      <Dumbbell size={19} />
                    )}
                  </span>
                  <div>
                    <strong>{exerciseName(workout)}</strong>
                    <span className="exercise-meta">
                      {workout.exercise_type || "Workout"}
                      {workout.is_pr && (
                        <span className="pr-badge">
                          <Trophy size={10} /> PR
                        </span>
                      )}
                    </span>
                    {workout.notes && (
                      <span className="workout-note" title={workout.notes}>
                        {workout.notes}
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td>
                {formatDate(workout.workout_date, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td>
                {workout.sets !== null && workout.reps !== null ? (
                  <>
                    <strong>{workout.sets}</strong>
                    <span className="muted"> × </span>
                    {workout.reps}
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td>
                <strong>
                  {workout.weight !== null
                    ? workout.weight
                    : (workout.duration_minutes ?? "—")}
                </strong>
                <span className="muted">
                  {workout.weight !== null
                    ? " kg"
                    : workout.duration_minutes !== null
                      ? " min"
                      : ""}
                </span>
                {workout.weight !== null &&
                  workout.duration_minutes !== null && (
                    <span className="cell-subtext">
                      {workout.duration_minutes} min
                    </span>
                  )}
              </td>
              <td>
                <div className="row-actions">
                  {onEdit ? (
                    <>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${exerciseName(workout)}`}
                        onClick={() => onEdit(workout)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-button danger-hover"
                        aria-label={`Delete ${exerciseName(workout)}`}
                        onClick={() => onDelete?.(workout)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/workouts"
                      className="icon-button"
                      aria-label={`View ${exerciseName(workout)} in workouts`}
                    >
                      <ArrowUpRight size={18} />
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
