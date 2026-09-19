-- Run once on databases created with the original schema.
-- Existing exercise rows/IDs are preserved. No workout data is rewritten.
BEGIN;

CREATE TABLE IF NOT EXISTS exercises (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('strength', 'cardio')),
    UNIQUE (name, type)
);

-- Do not guess names/types for orphan IDs in legacy workout data.
-- A missing exercise must be restored from the owner's known catalog first.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM workout_logs w
        LEFT JOIN exercises e ON e.id = w.exercise_id
        WHERE e.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Orphan workout exercise IDs exist; restore the matching exercises before migrating';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'workout_logs'::regclass
          AND confrelid = 'exercises'::regclass
          AND contype = 'f'
    ) THEN
        ALTER TABLE workout_logs
            ADD CONSTRAINT workout_logs_exercise_id_fkey
            FOREIGN KEY (exercise_id) REFERENCES exercises(id);
    END IF;
END $$;

COMMIT;
