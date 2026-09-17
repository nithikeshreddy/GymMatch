import { useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { gymApi, errorMessage } from "../api/client";
import { useGym, useToast } from "../context/contexts";
import { exerciseName, formatDate } from "../lib/format";
import type { Workout } from "../types";
import { Modal } from "./Modal";
import { ErrorNotice } from "./ui";

export function DeleteWorkout({
  workout,
  onClose,
}: {
  workout: Workout;
  onClose: () => void;
}) {
  const { reloadWorkouts } = useGym();
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await gymApi.deleteWorkout(workout.id);
      reloadWorkouts();
      notify("Workout deleted.");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Delete this workout?"
      description="This will permanently remove the workout from your history."
      onClose={onClose}
      busy={busy}
    >
      {error && <ErrorNotice message={error} />}
      <div className="delete-summary">
        <strong>{exerciseName(workout)}</strong>
        <span>{formatDate(workout.workout_date)}</span>
      </div>
      <div className="modal-footer">
        <button
          className="button button-secondary"
          onClick={onClose}
          disabled={busy}
        >
          Keep workout
        </button>
        <button
          className="button button-danger"
          onClick={() => void remove()}
          disabled={busy}
        >
          {busy ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <Trash2 size={17} />
          )}
          {busy ? "Deleting…" : "Delete workout"}
        </button>
      </div>
    </Modal>
  );
}
