CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE profiles (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    age INT ,
    gender TEXT,

    location_city TEXT,
    gym_name TEXT,

    fitness_goal TEXT,
    experience_level TEXT,
    preferred_time_slot TEXT,

    workout_preference TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workout_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    exercise_id INT NOT NULL,

    weight INT,
    reps INT,
    sets INT,
    duration_minutes INT,
    rest_time INT,
    
    notes TEXT,
    workout_date DATE DEFAULT CURRENT_DATE,
    is_pr boolean DEFAULT FALSE,
    

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE muscle_groups (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);


CREATE INDEX idx_workouts_user_id ON workout_logs(user_id);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

CREATE INDEX idx_workouts_exercise_id ON workout_logs(exercise_id);
CREATE INDEX idx_workouts_user_exercise ON workout_logs(user_id, exercise_id);
