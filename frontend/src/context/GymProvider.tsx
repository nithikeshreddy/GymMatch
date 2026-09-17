import { useEffect, useMemo, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { gymApi } from "../api/client";
import { configuredExercises } from "../config/exercises";
import { useResource } from "../hooks/useResource";
import { GymContext, useAuth, useToast } from "./contexts";
import type { PersonalRecordNotification } from "../types";

export function GymProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const notify = useToast();
  const profile = useResource(gymApi.profile);
  const workouts = useResource(gymApi.workouts);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    const apiUrl = import.meta.env.VITE_API_URL;
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (apiUrl?.startsWith("http") ? new URL(apiUrl).origin : undefined);
    const client = io(socketUrl, { autoConnect: false });
    client.on("connect", () => {
      client.emit("register_user", userId);
      setSocket(client);
      setConnected(true);
    });
    client.on("disconnect", () => setConnected(false));
    client.on("connect_error", () => setConnected(false));
    client.on("notification", (event: PersonalRecordNotification) => {
      if (typeof event?.message === "string") notify(event.message, "record");
    });
    client.connect();
    return () => {
      client.removeAllListeners();
      client.disconnect();
    };
  }, [userId, notify]);
  const exercises = useMemo(() => {
    const catalog = new Map(
      configuredExercises.map((exercise) => [exercise.id, exercise]),
    );
    for (const workout of workouts.data || []) {
      if (workout.exercise_name)
        catalog.set(workout.exercise_id, {
          id: workout.exercise_id,
          name: workout.exercise_name,
          type: workout.exercise_type,
        });
    }
    return [...catalog.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [workouts.data]);
  return (
    <GymContext.Provider
      value={{
        profile: profile.data,
        profileLoading: profile.loading,
        profileError: profile.error,
        reloadProfile: profile.reload,
        workouts: workouts.data || [],
        workoutsLoading: workouts.loading,
        workoutsError: workouts.error,
        reloadWorkouts: workouts.reload,
        exercises,
        socket,
        connected,
      }}
    >
      {children}
    </GymContext.Provider>
  );
}
