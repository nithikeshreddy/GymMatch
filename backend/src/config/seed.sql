-- Repeatable starter catalog. IDs are generated, never assumed by the client.
-- Account for existing/restored rows whose IDs were inserted explicitly.
DO $$
DECLARE
    id_sequence TEXT := pg_get_serial_sequence('exercises', 'id');
    largest_id BIGINT;
BEGIN
    SELECT MAX(id) INTO largest_id FROM exercises;
    IF id_sequence IS NOT NULL AND largest_id IS NOT NULL THEN
        PERFORM setval(id_sequence::regclass,
            GREATEST(largest_id, COALESCE(pg_sequence_last_value(id_sequence::regclass), 1)), true);
    END IF;
END $$;

INSERT INTO exercises (name, type)
SELECT name, type
FROM (VALUES
    ('Bench Press', 'strength'),
    ('Squat', 'strength'),
    ('Deadlift', 'strength'),
    ('Overhead Press', 'strength'),
    ('Running', 'cardio'),
    ('Cycling', 'cardio')
) AS seed(name, type)
WHERE NOT EXISTS (
    SELECT 1 FROM exercises existing
    WHERE existing.name = seed.name AND existing.type = seed.type
);
