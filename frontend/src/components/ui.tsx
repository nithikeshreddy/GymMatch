import {
  AlertCircle,
  ArrowRight,
  Dumbbell,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" to="/" aria-label="GymMatch home">
      <span className="brand-icon">
        <Dumbbell size={23} strokeWidth={2.5} />
      </span>
      {!compact && (
        <span>
          gym<span className="brand-light">match</span>
          <span className="brand-dot">.</span>
        </span>
      )}
    </Link>
  );
}
export function Loading({
  label = "Loading your progress…",
}: {
  label?: string;
}) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>{label}</span>
    </div>
  );
}
export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-notice" role="alert">
      <AlertCircle size={20} />
      <span>{message}</span>
      {onRetry && (
        <button className="text-button" onClick={onRetry}>
          <RotateCcw size={15} /> Try again
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  icon = <Dumbbell size={27} />,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Field({
  label,
  htmlFor,
  hint,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`field ${className}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <small id={`${htmlFor}-hint`}>{hint}</small>}
    </div>
  );
}
export function ArrowLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link className="arrow-link" to={to}>
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}
