export interface User {
  id: string;
  email: string;
  created_at?: string;
}
export interface Session {
  user: User;
  token: string;
}

export interface ProfileInput {
  name: string;
  age: number | null;
  gender: string | null;
  location_city: string | null;
  gym_name: string | null;
  fitness_goal: string | null;
  experience_level: string | null;
  preferred_time_slot: string | null;
  workout_preference: string | null;
}
export interface Profile extends ProfileInput {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}
export interface WorkoutInput {
  exercise_id: number;
  weight: number | null;
  reps: number | null;
  sets: number | null;
  duration_minutes: number | null;
  rest_time: number | null;
  notes: string | null;
  workout_date: string;
}
export interface Workout extends WorkoutInput {
  id: string;
  user_id: string;
  is_pr: boolean;
  exercise_name?: string;
  exercise_type?: string;
  created_at: string;
  updated_at: string;
}
export interface Exercise {
  id: number;
  name: string;
  type?: string;
}
export interface LeaderboardEntry {
  user_id: string;
  name: string;
  location_city: string | null;
  exercise_name: string;
  max_weight: number | string | null;
}
export interface PersonalRecordNotification {
  message: string;
  exercise_id: number;
}
