import { useEffect, useState, type ReactNode } from "react";
import { AuthContext } from "./contexts";
import {
  readSession,
  SESSION_EXPIRED,
  SESSION_KEY,
  writeSession,
} from "../lib/session";
import type { Session } from "../types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readSession);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    function expire() {
      writeSession(null);
      setSession(null);
      setExpired(true);
    }
    function sync(event: StorageEvent) {
      if (event.key === SESSION_KEY || event.key === null) {
        setSession(readSession());
        setExpired(false);
      }
    }
    window.addEventListener(SESSION_EXPIRED, expire);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EXPIRED, expire);
      window.removeEventListener("storage", sync);
    };
  }, []);
  function signIn(value: Session) {
    writeSession(value);
    setSession(value);
    setExpired(false);
  }
  function signOut() {
    writeSession(null);
    setSession(null);
    setExpired(false);
  }
  return (
    <AuthContext.Provider value={{ session, expired, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
