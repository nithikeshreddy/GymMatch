import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, Trophy, X, AlertCircle } from "lucide-react";
import { ToastContext } from "./contexts";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<
    { id: number; message: string; type: "success" | "error" | "record" }[]
  >([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sequence = useRef(0);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const notify = useCallback(
    (message: string, type: "success" | "error" | "record" = "success") => {
      const id = ++sequence.current;
      setToasts((previous) => [...previous.slice(-3), { id, message, type }]);
      timers.current.push(
        setTimeout(
          () =>
            setToasts((previous) =>
              previous.filter((toast) => toast.id !== id),
            ),
          6500,
        ),
      );
    },
    [],
  );
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            role={toast.type === "error" ? "alert" : "status"}
          >
            {toast.type === "record" ? (
              <Trophy size={20} />
            ) : toast.type === "error" ? (
              <AlertCircle size={20} />
            ) : (
              <Check size={20} />
            )}
            <span>{toast.message}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() =>
                setToasts((previous) =>
                  previous.filter((item) => item.id !== toast.id),
                )
              }
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
