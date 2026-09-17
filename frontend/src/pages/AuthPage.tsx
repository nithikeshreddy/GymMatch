import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Check,
  Dumbbell,
  Eye,
  EyeOff,
  LoaderCircle,
  Trophy,
} from "lucide-react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { gymApi, errorMessage } from "../api/client";
import { useAuth } from "../context/contexts";
import { Brand, ErrorNotice, Field } from "../components/ui";

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { session, signIn, expired } = useAuth();
  const location = useLocation();
  const signup = mode === "signup";
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const from: unknown = location.state?.from;
  const destination =
    typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//") &&
    !/^\/(login|signup)/.test(from)
      ? from
      : "/";
  if (session)
    return <Navigate to={signup ? "/profile" : destination} replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (signup && password !== form.get("confirm-password")) {
      setError("Your passwords don’t match. Please try again.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      signIn(
        await gymApi.authenticate(
          mode,
          String(form.get("email")).trim(),
          password,
        ),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="auth-story-content">
          <span className="auth-tag">
            <span className="tiny-dot" /> A LITTLE STRONGER, EVERY DAY
          </span>
          <h1>
            Your only
            <br />
            competition?
            <br />
            <span>Yesterday.</span>
          </h1>
          <p>
            Show up. Put in the work. See how far you’ve come.
            <br className="desktop-only" /> Your fitness journey belongs here.
          </p>
          <div className="strength-art" aria-hidden="true">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="weight-plate">
              <div className="plate-label">GYMMATCH</div>
              <div className="plate-center">
                <Dumbbell size={50} strokeWidth={1.5} />
              </div>
              <span className="plate-bottom">ONE REP AT A TIME</span>
            </div>
            <span className="art-spark spark-one">✳</span>
            <span className="art-spark spark-two">+</span>
            <div className="art-chip">
              <span>
                <Check size={15} />
              </span>
              Progress starts here
              <ArrowUpRight size={16} />
            </div>
          </div>
        </div>
        <div className="auth-story-footer">
          <span>CONSISTENCY IS YOUR SUPERPOWER.</span>
          <span>01 — ∞</span>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-switch">
          {signup ? "Already part of the club?" : "New to GymMatch?"}
          <Link
            to={signup ? "/login" : "/signup"}
            state={location.state}
            onClick={() => setError("")}
          >
            {signup ? "Sign in" : "Join the club"}
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="auth-form-wrap">
          <div className="auth-form-icon">
            <Dumbbell size={26} />
          </div>
          <p className="eyebrow">
            {signup ? "YOUR NEXT CHAPTER" : "LET’S GET BACK TO IT"}
          </p>
          <h2>{signup ? "Start your strong." : "Welcome back."}</h2>
          <p className="auth-description">
            {signup
              ? "Create your account. Make room for progress."
              : "Your progress is waiting. Let’s keep it going."}
          </p>
          <form key={mode} onSubmit={submit}>
            <fieldset disabled={busy}>
              {expired && (
                <div className="info-notice" role="status">
                  Your session has expired. Sign in to pick up where you left
                  off.
                </div>
              )}
              {error && <ErrorNotice message={error} />}
              <Field label="Email address" htmlFor="email">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </Field>
              <Field
                label="Password"
                htmlFor="password"
                hint={signup ? "Use at least 8 characters." : undefined}
              >
                <div className="password-input">
                  <input
                    id="password"
                    name="password"
                    type={visible ? "text" : "password"}
                    autoComplete={signup ? "new-password" : "current-password"}
                    minLength={signup ? 8 : undefined}
                    placeholder={
                      signup ? "Create a password" : "Enter your password"
                    }
                    required
                    aria-describedby={signup ? "password-hint" : undefined}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setVisible(!visible)}
                    aria-label={visible ? "Hide password" : "Show password"}
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              {signup && (
                <Field label="Confirm password" htmlFor="confirm-password">
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type={visible ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="One more time"
                    required
                    minLength={8}
                  />
                </Field>
              )}
              <button
                className="button button-primary auth-submit"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={18} />
                    {signup ? "Creating your account…" : "Signing in…"}
                  </>
                ) : (
                  <>
                    {signup ? "Create my account" : "Let’s get moving"}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </fieldset>
          </form>
          <div className="auth-benefits">
            <span>
              <Dumbbell size={16} />
              Track every rep
            </span>
            <span>
              <ChartNoAxesCombined size={16} />
              See your progress
            </span>
            <span>
              <Trophy size={16} />
              Raise the bar
            </span>
          </div>
        </div>
        <p className="auth-bottom">A stronger you starts with showing up.</p>
      </section>
    </div>
  );
}
