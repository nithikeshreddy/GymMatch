import { useId, useState } from "react";
import { useGym } from "../context/contexts";
import { Field } from "./ui";

export function ExercisePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { exercises } = useGym();
  const id = useId();
  const known = exercises.some((exercise) => String(exercise.id) === value);
  const [custom, setCustom] = useState(!known);
  return (
    <div className="exercise-picker">
      {exercises.length > 0 && (
        <Field label="Exercise" htmlFor={`${id}-select`}>
          <select
            id={`${id}-select`}
            value={!custom && known ? value : "custom"}
            onChange={(event) => {
              setCustom(event.target.value === "custom");
              onChange(
                event.target.value === "custom" ? "" : event.target.value,
              );
            }}
            disabled={disabled}
          >
            <option value="custom">Enter an exercise ID</option>
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {(custom || !known) && (
        <Field
          label="Exercise ID"
          htmlFor={`${id}-custom`}
          hint="Use an existing exercise ID. Exercises you’ve logged will appear here by name."
        >
          <input
            id={`${id}-custom`}
            name="exercise_id"
            type="number"
            min="1"
            max="2147483647"
            step="1"
            required
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="e.g. 1"
            disabled={disabled}
            aria-describedby={`${id}-custom-hint`}
          />
        </Field>
      )}
    </div>
  );
}
