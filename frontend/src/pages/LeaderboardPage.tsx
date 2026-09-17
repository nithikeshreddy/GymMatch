import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Medal, RefreshCw, Trophy, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { gymApi } from "../api/client";
import { ExercisePicker } from "../components/ExercisePicker";
import {
  EmptyState,
  ErrorNotice,
  Loading,
  PageHeading,
} from "../components/ui";
import { useAuth, useGym } from "../context/contexts";
import { useResource } from "../hooks/useResource";
import { initials, number } from "../lib/format";

export default function LeaderboardPage() {
  const { session } = useAuth();
  const { socket, connected, exercises } = useGym();
  const [params, setParams] = useSearchParams();
  const parameter = Number(params.get("exercise"));
  const exerciseId =
    Number.isInteger(parameter) && parameter > 0 && parameter <= 2147483647
      ? parameter
      : null;
  const [draft, setDraft] = useState(exerciseId ? String(exerciseId) : "");
  const loader = useCallback(
    (signal: AbortSignal) =>
      exerciseId ? gymApi.leaderboard(exerciseId, signal) : Promise.resolve([]),
    [exerciseId],
  );
  const { data, loading, error, reload } = useResource(loader);
  useEffect(() => {
    if (!socket || !exerciseId) return;
    function join() {
      socket!.emit("join_exercise", exerciseId);
      reload();
    }
    function update(event: { exercise_id: number | string }) {
      if (Number(event?.exercise_id) === exerciseId) reload();
    }
    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("leaderboard_update", update);
    return () => {
      socket.off("connect", join);
      socket.off("leaderboard_update", update);
    };
  }, [socket, exerciseId, reload]);
  function select(event: FormEvent) {
    event.preventDefault();
    setParams({ exercise: draft });
    if (Number(draft) === exerciseId) reload();
  }
  const name =
    exercises.find((exercise) => exercise.id === exerciseId)?.name ||
    data?.[0]?.exercise_name ||
    (exerciseId ? `Exercise #${exerciseId}` : "Choose your challenge");
  const myRank =
    data?.findIndex((entry) => entry.user_id === session?.user.id) ?? -1;
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE FRIENDLY COMPETITION"
        title="Raise the bar."
        description="Big efforts. New benchmarks. See where you stand."
      />
      <section className="leaderboard-banner">
        <div>
          <span className="eyebrow">STRONGER, TOGETHER</span>
          <h2>
            Great effort deserves
            <br />a place on the board.
          </h2>
          <p>
            The top 10 athletes by highest recorded weight, for each exercise.
          </p>
        </div>
        <div className="leaderboard-banner-art" aria-hidden="true">
          <Trophy size={86} strokeWidth={1.2} />
          <span>✳</span>
        </div>
      </section>
      <section className="panel leaderboard-panel">
        <div className="leaderboard-controls">
          <form onSubmit={select}>
            <ExercisePicker value={draft} onChange={setDraft} />
            <button className="button button-primary" type="submit">
              View leaderboard
              <ArrowRight size={16} />
            </button>
          </form>
          <div className="leaderboard-live">
            <span
              className={`connection-status ${connected ? "is-connected" : ""}`}
            >
              <span />
              {connected ? "Updating live" : "Live updates reconnecting"}
            </span>
            <button
              className="icon-button"
              aria-label="Refresh leaderboard"
              onClick={reload}
              disabled={!exerciseId || loading}
            >
              <RefreshCw
                size={17}
                className={loading && exerciseId ? "spin" : ""}
              />
            </button>
          </div>
        </div>
        <div className="panel-heading leaderboard-title">
          <div>
            <h2>{name}</h2>
            <p>
              {exerciseId
                ? "All-time best lifts · Ranked by weight"
                : "Select an exercise to see the rankings."}
            </p>
          </div>
          {myRank >= 0 && !loading && !error && (
            <span className="your-rank">
              <Medal size={17} />
              Your rank: #{myRank + 1}
            </span>
          )}
        </div>
        {!exerciseId ? (
          <EmptyState
            icon={<Trophy size={30} />}
            title="Find your next benchmark."
            description="Pick an exercise above to explore the leaderboard and see the strongest lifts."
          />
        ) : loading ? (
          <Loading label="Finding the strongest lifts…" />
        ) : error ? (
          <div className="panel-error">
            <ErrorNotice message={error} onRetry={reload} />
          </div>
        ) : data?.length ? (
          <div
            className="table-scroll"
            role="region"
            aria-label="Exercise rankings"
            tabIndex={0}
          >
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>RANK</th>
                  <th>ATHLETE</th>
                  <th>CITY</th>
                  <th>BEST LIFT</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry, index) => (
                  <tr
                    key={entry.user_id}
                    className={
                      entry.user_id === session?.user.id ? "my-ranking" : ""
                    }
                  >
                    <td>
                      <span className={`rank rank-${index + 1}`}>
                        {index < 3 ? (
                          <Medal size={23} />
                        ) : (
                          String(index + 1).padStart(2, "0")
                        )}
                        <span className="sr-only">
                          {index < 3 ? index + 1 : ""}
                        </span>
                      </span>
                    </td>
                    <td>
                      <div className="athlete-cell">
                        <span
                          className={`avatar athlete-avatar avatar-tone-${index % 4}`}
                        >
                          {initials(entry.name)}
                        </span>
                        <strong>{entry.name}</strong>
                        {entry.user_id === session?.user.id && (
                          <span className="you-badge">YOU</span>
                        )}
                      </div>
                    </td>
                    <td>{entry.location_city || "—"}</td>
                    <td>
                      <strong>
                        {entry.max_weight === null
                          ? "—"
                          : number(Number(entry.max_weight))}
                      </strong>
                      {entry.max_weight !== null && (
                        <span className="muted"> kg</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Users size={28} />}
            title="There’s room at the top."
            description="No ranked workouts yet. Create your profile and log a lift for this exercise to get on the board."
          />
        )}
        <div className="leaderboard-footnote">
          <Trophy size={15} />
          <span>
            Your best recorded weight earns your place. Complete your profile to
            appear in the rankings.
          </span>
        </div>
      </section>
    </>
  );
}
