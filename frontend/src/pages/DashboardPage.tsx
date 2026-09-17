import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Dumbbell,
  Flame,
  MapPin,
  Target,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { DatePill, LogWorkoutLink } from "../components/Layout";
import {
  ArrowLink,
  EmptyState,
  ErrorNotice,
  Loading,
  PageHeading,
} from "../components/ui";
import { WorkoutTable } from "../components/WorkoutTable";
import { useAuth, useGym } from "../context/contexts";
import {
  dateKey,
  exerciseName,
  formatDate,
  number,
  volume,
  workoutDate,
} from "../lib/format";

export default function DashboardPage() {
  const { session } = useAuth();
  const {
    profile,
    workouts,
    workoutsLoading,
    workoutsError,
    reloadWorkouts,
    profileError,
    reloadProfile,
  } = useGym();
  const name =
    profile?.name?.split(" ")[0] ||
    session?.user.email.split("@")[0] ||
    "athlete";
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + index);
    return {
      key: dateKey(date),
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
    };
  });
  const daily = days.map((day) => ({
    ...day,
    count: workouts.filter(
      (workout) => workoutDate(workout.workout_date) === day.key,
    ).length,
  }));
  const weekCount = daily.reduce((total, day) => total + day.count, 0);
  const max = Math.max(1, ...daily.map((day) => day.count));
  const records = workouts.filter((workout) => workout.is_pr);
  const stats = [
    {
      label: "Workout entries",
      value: number(workouts.length),
      detail: "Every effort adds up",
      icon: Dumbbell,
      color: "green",
    },
    {
      label: "Total volume lifted",
      value: number(
        workouts.reduce((total, workout) => total + volume(workout), 0),
      ),
      unit: "kg",
      detail: "Weight × reps × sets",
      icon: TrendingUp,
      color: "blue",
    },
    {
      label: "Personal records",
      value: number(records.length),
      detail: "Your moments of progress",
      icon: Trophy,
      color: "orange",
    },
    {
      label: "Active days",
      value: String(daily.filter((day) => day.count > 0).length),
      unit: "/ 7",
      detail: "Over the last seven days",
      icon: Flame,
      color: "rose",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE BETTER, EVERY DAY"
        title={`Let’s go, ${name}.`}
        description="Here’s your progress. Let’s build on it."
      >
        <DatePill />
      </PageHeading>
      <section className="dashboard-hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span className="tiny-dot" /> YOUR NEXT CHAPTER STARTS TODAY
          </span>
          <h2>
            Progress is a habit.
            <br />
            <span>Make it yours.</span>
          </h2>
          <p>
            Every set. Every rep. Every time you show up.
            <br />
            It all counts toward a stronger you.
          </p>
          <LogWorkoutLink className="button button-lime" />
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-art-ring ring-outer" />
          <div className="hero-art-ring ring-inner" />
          <span className="hero-star">✳</span>
          <div className="hero-dumbbell">
            <Dumbbell size={106} strokeWidth={1.3} />
          </div>
          <span className="hero-art-caption">
            SHOW UP. GET STRONGER. REPEAT.
          </span>
          <span className="hero-plus">+</span>
        </div>
      </section>
      {workoutsError && (
        <ErrorNotice message={workoutsError} onRetry={reloadWorkouts} />
      )}
      <section className="stats-grid" aria-label="Your training statistics">
        {stats.map(({ label, value, unit, detail, icon: Icon, color }) => (
          <article className="stat-card" key={label}>
            <div className="stat-label">
              <span>{label}</span>
              <span className={`stat-icon ${color}`}>
                <Icon size={17} />
              </span>
            </div>
            <div className="stat-value">
              {workoutsLoading || workoutsError ? "—" : value}
              {!workoutsLoading && !workoutsError && unit && (
                <span>{unit}</span>
              )}
            </div>
            <p>{detail}</p>
          </article>
        ))}
      </section>
      <div className="dashboard-middle">
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>
                Your week in motion<span className="heading-dot">.</span>
              </h2>
              <p>A little consistency goes a long way.</p>
            </div>
            <span className="subtle-pill">
              <CalendarDays size={13} />
              Last 7 days
            </span>
          </div>
          {workoutsLoading ? (
            <Loading />
          ) : workoutsError ? (
            <p className="chart-unavailable">
              Your activity will appear when workouts are available.
            </p>
          ) : (
            <>
              <div className="activity-summary">
                <strong>{weekCount}</strong>
                <span>
                  workout {weekCount === 1 ? "entry" : "entries"}
                  <small>
                    {daily.filter((day) => day.count > 0).length} active days
                    this week
                  </small>
                </span>
                <span className="chart-legend">
                  <span /> Workout entries
                </span>
              </div>
              <div
                className="activity-chart"
                role="img"
                aria-label={`Workouts in the last seven days: ${daily.map((day) => `${day.label} ${day.count}`).join(", ")}`}
              >
                <div className="chart-grid-lines">
                  <span />
                  <span />
                  <span />
                </div>
                {daily.map((day, index) => (
                  <div
                    className={`chart-column ${index === 6 ? "chart-today" : ""}`}
                    key={day.key}
                  >
                    <div className="bar-space">
                      <span
                        className={`chart-bar ${day.count === 0 ? "bar-empty" : ""}`}
                        style={{
                          height: `${day.count ? Math.max(9, (day.count / max) * 100) : 3}%`,
                        }}
                      >
                        <span className="bar-value">{day.count}</span>
                      </span>
                    </div>
                    <span className="chart-day">{day.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
        <section className="panel records-panel">
          <div className="panel-heading">
            <div>
              <span className="record-emblem">
                <Trophy size={23} />
              </span>
              <h2>A little stronger.</h2>
              <p>Your most recent personal record.</p>
            </div>
            <ArrowUpRight size={20} className="muted" />
          </div>
          {workoutsLoading ? (
            <Loading label="Loading records…" />
          ) : workoutsError ? (
            <p className="muted">
              Records will appear when your workouts load.
            </p>
          ) : records[0] ? (
            <div className="latest-record">
              <span className="eyebrow">{exerciseName(records[0])}</span>
              <div>
                {records[0].weight ?? "—"}
                <span>kg</span>
              </div>
              <p>
                <Trophy size={14} />
                Personal best ·{" "}
                {formatDate(records[0].workout_date, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <div className="record-bottom">
                You put in the work. It shows.<span>↗</span>
              </div>
            </div>
          ) : (
            <div className="record-empty">
              <h3>
                Your next milestone
                <br />
                is out there.
              </h3>
              <p>
                Log a strength workout to start building your personal records.
              </p>
              <ArrowLink to="/workouts?new=1">
                Set your starting point
              </ArrowLink>
            </div>
          )}
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent workouts</h2>
              <p>Your work, on the record.</p>
            </div>
            <ArrowLink to="/workouts">View all</ArrowLink>
          </div>
          {workoutsLoading ? (
            <Loading />
          ) : workoutsError ? (
            <EmptyState
              title="Your history is unavailable"
              description="Try refreshing your workouts to see your latest progress."
            />
          ) : workouts.length ? (
            <WorkoutTable workouts={workouts.slice(0, 4)} />
          ) : (
            <EmptyState
              title="Your story starts with one workout."
              description="Log your first workout and watch your progress take shape."
            >
              <LogWorkoutLink />
            </EmptyState>
          )}
        </section>
        <section className="panel journey-panel">
          <div className="panel-heading">
            <h2>Your training compass</h2>
            <Target size={20} />
          </div>
          {profileError ? (
            <ErrorNotice message={profileError} onRetry={reloadProfile} />
          ) : (
            <>
              <div className="journey-goal">
                <span className="eyebrow">THE GOAL</span>
                <h3>{profile?.fitness_goal || "Find your stronger."}</h3>
              </div>
              <div className="journey-detail">
                <MapPin size={17} />
                <div>
                  <span>Your gym</span>
                  <strong>{profile?.gym_name || "Your space to grow"}</strong>
                </div>
              </div>
              <div className="journey-detail">
                <Activity size={17} />
                <div>
                  <span>Experience</span>
                  <strong>
                    {profile?.experience_level || "Every journey is different"}
                  </strong>
                </div>
              </div>
              <ArrowLink to="/profile">
                {profile ? "View your profile" : "Set up your profile"}
              </ArrowLink>
            </>
          )}
          <Link className="leaderboard-cta" to="/leaderboard">
            <Trophy size={19} />
            <span>
              A little friendly competition
              <small>Explore the leaderboard</small>
            </span>
            <ArrowUpRight size={18} />
          </Link>
        </section>
      </div>
    </>
  );
}
