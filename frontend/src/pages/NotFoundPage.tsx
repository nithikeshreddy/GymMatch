import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/ui";

export default function NotFoundPage() {
  return (
    <section className="panel">
      <EmptyState
        icon={<Compass size={32} />}
        title="A little off track."
        description="This page doesn’t exist. Let’s get you back to your progress."
      >
        <Link className="button button-primary" to="/">
          <ArrowLeft size={17} />
          Back to overview
        </Link>
      </EmptyState>
    </section>
  );
}
