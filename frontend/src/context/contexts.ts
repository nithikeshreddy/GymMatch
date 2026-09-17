import { createContext, useContext } from "react";
import type { Socket } from "socket.io-client";
import type { Exercise, Profile, Session, Workout } from "../types";

export const AuthContext = createContext<{
  session: Session | null;
  expired: boolean;
  signIn: (session: Session) => void;
  signOut: () => void;
} | null>(null);

export const ToastContext = createContext<
  ((message: string, type?: "success" | "error" | "record") => void) | null
>(null);

export const GymContext = createContext<{
  profile: Profile | null | undefined;
  profileLoading: boolean;
  profileError: string;
  reloadProfile: () => void;
  workouts: Workout[];
  workoutsLoading: boolean;
  workoutsError: string;
  reloadWorkouts: () => void;
  exercises: Exercise[];
  socket: Socket | null;
  connected: boolean;
} | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("ToastProvider is required");
  return context;
}
export function useGym() {
  const context = useContext(GymContext);
  if (!context) throw new Error("GymProvider is required");
  return context;
}
