import {
  ArrowUpRight,
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth, useGym } from "../context/contexts";
import { initials } from "../lib/format";
import { Brand } from "./ui";

const navigation = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/workouts", label: "My workouts", icon: Dumbbell },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/profile", label: "My profile", icon: UserRound },
];

export default function Layout() {
  const { session, signOut } = useAuth();
  const { profile, connected } = useGym();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const trigger = menuButton.current;
    closeButton.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    const desktop = window.matchMedia("(min-width: 761px)");
    function onResize() {
      if (desktop.matches) setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onResize);
      trigger?.focus();
    };
  }, [menuOpen]);
  const location = useLocation();
  const name = profile?.name || session?.user.email.split("@")[0] || "Athlete";
  const title =
    navigation.find((item) => item.to === location.pathname)?.label ||
    "GymMatch";
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            ref={closeButton}
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <X size={22} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="tiny-dot" /> YOUR TRAINING SPACE
        </div>
        <nav>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              end={to === "/"}
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
              {to === "/leaderboard" && <span className="nav-live">LIVE</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-star">✳</span>
            <h3>
              Small steps.
              <br />
              Stronger you.
            </h3>
            <p>Your next personal best starts with showing up.</p>
            <Link to="/workouts?new=1" onClick={() => setMenuOpen(false)}>
              Make it count <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="sidebar-user">
            <span className="avatar">{initials(name)}</span>
            <div>
              <strong>{name}</strong>
              <span>Your fitness journey</span>
            </div>
            <button
              className="icon-button"
              aria-label="Sign out"
              title="Sign out"
              onClick={signOut}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell" inert={menuOpen}>
        <header className="topbar">
          <div className="topbar-title">
            <button
              ref={menuButton}
              className="icon-button mobile-only"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="topbar-breadcrumb">
              Your workspace <span>/</span>
            </span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span
              className={`connection-status ${connected ? "is-connected" : ""}`}
              title={
                connected
                  ? "Live updates connected"
                  : "Live updates are reconnecting; you can still use the app"
              }
            >
              <span />
              {connected ? "Live updates on" : "Connecting live updates"}
            </span>
            <Link
              className="avatar avatar-small"
              to="/profile"
              aria-label="View your profile"
            >
              {initials(name)}
            </Link>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Built one rep at a time.</span>
          <span>
            GYMMATCH <span className="footer-dot">✳</span>
          </span>
        </footer>
      </div>
    </div>
  );
}

export function LogWorkoutLink({
  className = "button button-primary",
  children = "Log a workout",
}: {
  className?: string;
  children?: string;
}) {
  return (
    <Link to="/workouts?new=1" className={className}>
      <Plus size={18} />
      {children}
    </Link>
  );
}
export function DatePill() {
  return (
    <span className="date-pill">
      <CalendarDays size={16} />
      {new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
    </span>
  );
}
