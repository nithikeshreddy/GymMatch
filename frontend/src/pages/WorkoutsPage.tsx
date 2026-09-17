import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Search,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { LogWorkoutLink } from "../components/Layout";
import { DeleteWorkout } from "../components/DeleteWorkout";
import { WorkoutForm } from "../components/WorkoutForm";
import { WorkoutTable } from "../components/WorkoutTable";
import {
  EmptyState,
  ErrorNotice,
  Loading,
  PageHeading,
} from "../components/ui";
import { useGym } from "../context/contexts";
import { exerciseName, number } from "../lib/format";
import type { Workout } from "../types";

const PAGE_SIZE = 10;
export default function WorkoutsPage() {
  const { workouts, workoutsLoading, workoutsError, reloadWorkouts } = useGym();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState<Workout | undefined>();
  const [deleting, setDeleting] = useState<Workout | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("newest");
  const filtered = workouts
    .filter((workout) => {
      const matches = `${exerciseName(workout)} ${workout.notes || ""}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return (
        matches &&
        (filter === "all" ||
          (filter === "pr" ? workout.is_pr : workout.exercise_type === filter))
      );
    })
    .sort((a, b) =>
      sort === "oldest"
        ? (a.workout_date || "").localeCompare(b.workout_date || "")
        : (b.workout_date || "").localeCompare(a.workout_date || ""),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  function closeForm() {
    setEditing(undefined);
    setSearchParams({}, { replace: true });
  }
  return (
    <>
      <PageHeading
        eyebrow="PUT YOUR PROGRESS ON THE RECORD"
        title="Every workout counts."
        description="Your effort, your history, your next personal best."
      >
        <LogWorkoutLink />
      </PageHeading>
      <div className="workout-summary-strip">
        <span>
          <Dumbbell size={18} />
          <strong>
            {workoutsLoading || workoutsError ? "—" : number(workouts.length)}
          </strong>{" "}
          workout entries
        </span>
        <span>
          <Trophy size={18} />
          <strong>
            {workoutsLoading || workoutsError
              ? "—"
              : workouts.filter((workout) => workout.is_pr).length}
          </strong>{" "}
          personal records
        </span>
        <span className="summary-caption">
          Built with consistency. One rep at a time.
        </span>
      </div>
      {workoutsError && (
        <ErrorNotice message={workoutsError} onRetry={reloadWorkouts} />
      )}
      <section className="panel workout-list-panel">
        <div className="workout-toolbar">
          <div className="filter-tabs" aria-label="Filter workouts">
            {[
              { value: "all", label: "All workouts" },
              { value: "strength", label: "Strength" },
              { value: "cardio", label: "Cardio" },
              { value: "pr", label: "Personal records" },
            ].map((tab) => (
              <button
                key={tab.value}
                className={filter === tab.value ? "selected" : ""}
                aria-pressed={filter === tab.value}
                onClick={() => {
                  setFilter(tab.value);
                  setPage(1);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="workout-search-row">
            <div className="search-field">
              <Search size={17} />
              <input
                aria-label="Search workouts"
                placeholder="Search exercises or notes…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <label className="sort-control">
              <SlidersHorizontal size={16} />
              <span className="sr-only">Sort workouts</span>
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>
        </div>
        {workoutsLoading ? (
          <Loading label="Loading your workout history…" />
        ) : workoutsError && !workouts.length ? (
          <EmptyState
            title="Let’s try that again."
            description="Your workouts couldn’t be loaded. Use the retry button above to reconnect."
          />
        ) : filtered.length ? (
          <>
            <WorkoutTable
              workouts={filtered.slice(
                (currentPage - 1) * PAGE_SIZE,
                currentPage * PAGE_SIZE,
              )}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
            <div className="pagination">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
                {number(filtered.length)} entries
              </span>
              <div>
                <button
                  className="icon-button"
                  aria-label="Previous page"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <span>
                  Page {currentPage} of {pages}
                </span>
                <button
                  className="icon-button"
                  aria-label="Next page"
                  disabled={currentPage === pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        ) : workouts.length ? (
          <EmptyState
            icon={<Search size={27} />}
            title="No workouts found."
            description="Try another exercise name or adjust your filters."
          >
            <button
              className="button button-secondary"
              onClick={() => {
                setQuery("");
                setFilter("all");
                setPage(1);
              }}
            >
              Clear filters
            </button>
          </EmptyState>
        ) : (
          <EmptyState
            title="The first one is a fresh start."
            description="Log a workout to start your training history. Future you will thank you."
          >
            <LogWorkoutLink />
          </EmptyState>
        )}
      </section>
      {(searchParams.get("new") === "1" || editing) && (
        <WorkoutForm
          key={editing?.id || "new"}
          workout={editing}
          onClose={closeForm}
        />
      )}
      {deleting && (
        <DeleteWorkout workout={deleting} onClose={() => setDeleting(null)} />
      )}
    </>
  );
}
