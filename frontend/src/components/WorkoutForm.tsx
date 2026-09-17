import { useState, type FormEvent } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { gymApi, errorMessage } from "../api/client";
import { useGym, useToast } from "../context/contexts";
import { dateKey, workoutDate } from "../lib/format";
import type { Workout, WorkoutInput } from "../types";
import { Modal } from "./Modal";
import { ExercisePicker } from "./ExercisePicker";
import { ErrorNotice, Field } from "./ui";

export function WorkoutForm({
  workout,
  onClose,
}: {
  workout?: Workout;
  onClose: () => void;
}) {
  const { reloadWorkouts } = useGym();
  const notify = useToast();
  const [exercise, setExercise] = useState(
    workout ? String(workout.exercise_id) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const numeric = (key: string) =>
      form.get(key) === "" ? null : Number(form.get(key));
    const input: WorkoutInput = {
      exercise_id: Number(exercise),
      weight: numeric("weight"),
      reps: numeric("reps"),
      sets: numeric("sets"),
      duration_minutes: numeric("duration_minutes"),
      rest_time: numeric("rest_time"),
      notes: String(form.get("notes") || "").trim() || null,
      workout_date: String(form.get("workout_date")),
    };
    if (!Number.isInteger(input.exercise_id) || input.exercise_id < 1) {
      setError("Choose a valid exercise ID.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await gymApi.saveWorkout(input, workout?.id);
      reloadWorkouts();
      notify(
        workout
          ? "Workout updated. Keep moving forward."
          : saved.is_pr
            ? "Workout saved. A new personal record!"
            : "Workout logged. One step stronger.",
      );
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={workout ? "Edit your workout" : "Make this one count."}
      description={
        workout
          ? "Update the details of your workout."
          : "A little effort today. Progress you can see tomorrow."
      }
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {error && <ErrorNotice message={error} />}
          <ExercisePicker value={exercise} onChange={setExercise} />
          <Field label="Workout date" htmlFor="workout-date">
            <input
              id="workout-date"
              name="workout_date"
              type="date"
              required
              defaultValue={workoutDate(workout?.workout_date) || dateKey()}
            />
          </Field>
          <div className="form-section-label">
            WORKOUT DETAILS <span>Fill in what you tracked</span>
          </div>
          <div className="form-grid three-columns">
            {[
              {
                name: "weight",
                label: "Weight (kg)",
                value: workout?.weight,
                min: 0,
              },
              { name: "sets", label: "Sets", value: workout?.sets, min: 1 },
              {
                name: "reps",
                label: "Reps per set",
                value: workout?.reps,
                min: 1,
              },
            ].map((field) => (
              <Field
                key={field.name}
                label={field.label}
                htmlFor={`workout-${field.name}`}
              >
                <input
                  id={`workout-${field.name}`}
                  name={field.name}
                  type="number"
                  min={field.min}
                  max="2147483647"
                  step="1"
                  defaultValue={field.value ?? ""}
                  placeholder="—"
                />
              </Field>
            ))}
          </div>
          <div className="form-grid">
            <Field label="Duration (minutes)" htmlFor="workout-duration">
              <input
                id="workout-duration"
                name="duration_minutes"
                type="number"
                min="1"
                max="2147483647"
                step="1"
                defaultValue={workout?.duration_minutes ?? ""}
                placeholder="Optional"
              />
            </Field>
            <Field label="Rest between sets (seconds)" htmlFor="workout-rest">
              <input
                id="workout-rest"
                name="rest_time"
                type="number"
                min="0"
                max="2147483647"
                step="1"
                defaultValue={workout?.rest_time ?? ""}
                placeholder="Optional"
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="workout-notes">
            <textarea
              id="workout-notes"
              name="notes"
              rows={3}
              defaultValue={workout?.notes ?? ""}
              placeholder="How did it feel? Anything to remember for next time?"
            />
          </Field>
        </fieldset>
        <div className="modal-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            {busy ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <Check size={17} />
            )}
            {busy ? "Saving…" : workout ? "Save changes" : "Save workout"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
