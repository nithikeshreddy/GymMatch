import { useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Check,
  Dumbbell,
  LoaderCircle,
  Mail,
  MapPin,
  Target,
  UserRound,
} from "lucide-react";
import { gymApi, errorMessage } from "../api/client";
import { ErrorNotice, Field, Loading, PageHeading } from "../components/ui";
import { useAuth, useGym, useToast } from "../context/contexts";
import { initials } from "../lib/format";
import type { Profile, ProfileInput } from "../types";

export default function ProfilePage() {
  const { profile, profileLoading, profileError, reloadProfile } = useGym();
  return (
    <>
      <PageHeading
        eyebrow="THE PERSON BEHIND THE PROGRESS"
        title={profile ? "Make it personal." : "Every journey starts with you."}
        description={
          profile
            ? "Your goals, your gym, your way of showing up."
            : "Set up your profile and put your name on your progress."
        }
      />
      {profileLoading ? (
        <div className="panel">
          <Loading label="Loading your profile…" />
        </div>
      ) : profileError ? (
        <ErrorNotice message={profileError} onRetry={reloadProfile} />
      ) : (
        <ProfileForm
          key={profile?.updated_at || profile?.id || "new"}
          profile={profile || null}
        />
      )}
    </>
  );
}

function ProfileForm({ profile }: { profile: Profile | null }) {
  const { session } = useAuth();
  const { reloadProfile } = useGym();
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) || "").trim() || null;
    const input: ProfileInput = {
      name: text("name") || "",
      age: text("age") ? Number(form.get("age")) : null,
      gender: text("gender"),
      location_city: text("location_city"),
      gym_name: text("gym_name"),
      fitness_goal: text("fitness_goal"),
      experience_level: text("experience_level"),
      preferred_time_slot: text("preferred_time_slot"),
      workout_preference: text("workout_preference"),
    };
    if (!input.name) {
      setError("Please enter your name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await gymApi.saveProfile(input, Boolean(profile));
      notify(
        profile
          ? "Profile updated. Make it your journey."
          : "Your profile is ready. Welcome to GymMatch!",
      );
      reloadProfile();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="profile-layout">
      <aside className="profile-summary panel">
        <div className="profile-cover">
          <span>✳</span>
        </div>
        <div className="profile-avatar">
          {profile ? initials(profile.name) : <UserRound size={34} />}
        </div>
        <h2>{profile?.name || "Your next chapter"}</h2>
        <p>{profile?.fitness_goal || "A little stronger, every day."}</p>
        <div className="profile-summary-details">
          <span>
            <Mail size={16} />
            {session?.user.email}
          </span>
          {profile?.location_city && (
            <span>
              <MapPin size={16} />
              {profile.location_city}
            </span>
          )}
          {profile?.gym_name && (
            <span>
              <Dumbbell size={16} />
              {profile.gym_name}
            </span>
          )}
        </div>
        <div className="profile-tip">
          <Target size={22} />
          <strong>Give your progress a purpose.</strong>
          <p>
            A goal to work toward. A routine that fits. This is your space to
            make it happen.
          </p>
          <ArrowUpRight size={20} />
        </div>
      </aside>
      <form className="panel profile-form" onSubmit={submit}>
        <fieldset disabled={busy}>
          {error && <ErrorNotice message={error} />}
          <div className="profile-section-heading">
            <span className="section-number">01</span>
            <div>
              <h2>The basics</h2>
              <p>Your name is required. Everything else is up to you.</p>
            </div>
          </div>
          <Field label="Full name *" htmlFor="profile-name">
            <input
              id="profile-name"
              name="name"
              required
              autoComplete="name"
              placeholder="What should we call you?"
              defaultValue={profile?.name || ""}
            />
          </Field>
          <div className="form-grid">
            <Field label="Age" htmlFor="profile-age">
              <input
                id="profile-age"
                name="age"
                type="number"
                min="1"
                max="120"
                step="1"
                placeholder="Your age"
                defaultValue={profile?.age ?? ""}
              />
            </Field>
            <Field label="Gender" htmlFor="profile-gender">
              <input
                id="profile-gender"
                name="gender"
                autoComplete="sex"
                list="gender-options"
                placeholder="How you identify (optional)"
                defaultValue={profile?.gender || ""}
              />
              <datalist id="gender-options">
                <option value="Woman" />
                <option value="Man" />
                <option value="Non-binary" />
                <option value="Prefer not to say" />
              </datalist>
            </Field>
          </div>
          <div className="form-grid">
            <Field label="City" htmlFor="profile-city">
              <input
                id="profile-city"
                name="location_city"
                autoComplete="address-level2"
                placeholder="Your city"
                defaultValue={profile?.location_city || ""}
              />
            </Field>
            <Field label="Gym name" htmlFor="profile-gym">
              <input
                id="profile-gym"
                name="gym_name"
                placeholder="Where you put in the work"
                defaultValue={profile?.gym_name || ""}
              />
            </Field>
          </div>
          <div className="profile-section-heading section-divider">
            <span className="section-number">02</span>
            <div>
              <h2>Your training, your way</h2>
              <p>Tell us what you’re working toward.</p>
            </div>
          </div>
          <Field label="Fitness goal" htmlFor="profile-goal">
            <input
              id="profile-goal"
              name="fitness_goal"
              list="goal-options"
              placeholder="e.g. Build strength and feel my best"
              defaultValue={profile?.fitness_goal || ""}
            />
            <datalist id="goal-options">
              <option value="Build strength" />
              <option value="Build muscle" />
              <option value="Improve endurance" />
              <option value="Stay active and healthy" />
            </datalist>
          </Field>
          <div className="form-grid">
            <Field label="Experience level" htmlFor="profile-experience">
              <input
                id="profile-experience"
                name="experience_level"
                list="experience-options"
                placeholder="Choose or enter your level"
                defaultValue={profile?.experience_level || ""}
              />
              <datalist id="experience-options">
                <option value="Beginner" />
                <option value="Intermediate" />
                <option value="Advanced" />
              </datalist>
            </Field>
            <Field label="Preferred workout time" htmlFor="profile-time">
              <input
                id="profile-time"
                name="preferred_time_slot"
                list="time-options"
                placeholder="When do you like to train?"
                defaultValue={profile?.preferred_time_slot || ""}
              />
              <datalist id="time-options">
                <option value="Early morning" />
                <option value="Morning" />
                <option value="Afternoon" />
                <option value="Evening" />
                <option value="Flexible" />
              </datalist>
            </Field>
          </div>
          <Field label="Workout preference" htmlFor="profile-preference">
            <input
              id="profile-preference"
              name="workout_preference"
              list="preference-options"
              placeholder="Your favorite way to move"
              defaultValue={profile?.workout_preference || ""}
            />
            <datalist id="preference-options">
              <option value="Strength training" />
              <option value="Cardio" />
              <option value="A mix of both" />
              <option value="Functional fitness" />
            </datalist>
          </Field>
        </fieldset>
        <div className="profile-form-footer">
          <span>Make this journey your own.</span>
          <button className="button button-primary" disabled={busy}>
            {busy ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <Check size={17} />
            )}
            {busy ? "Saving…" : profile ? "Save changes" : "Create my profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
