import type { Session } from "../types";

export const SESSION_KEY = "gymmatch.session";
export const SESSION_EXPIRED = "gymmatch:session-expired";

export function readSession(): Session | null {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(SESSION_KEY) || "null",
    );
    if (
      !value ||
      typeof value !== "object" ||
      !("token" in value) ||
      typeof value.token !== "string" ||
      !("user" in value) ||
      !value.user ||
      typeof value.user !== "object" ||
      !("id" in value.user) ||
      typeof value.user.id !== "string" ||
      !("email" in value.user) ||
      typeof value.user.email !== "string"
    )
      return null;
    return value as Session;
  } catch {
    return null;
  }
}

export function writeSession(session: Session | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}
