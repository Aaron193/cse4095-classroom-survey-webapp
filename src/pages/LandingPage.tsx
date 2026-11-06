import { Link } from "react-router-dom";
export default function LandingPage() {
  return (
    <main className="center-page">
      <div className="landing">
        <h1>Classroom Survey</h1>
        <p>Quick in-class understanding checks</p>
        <Link className="button button-primary" to="/login">
          Instructor Login
        </Link>
      </div>
    </main>
  );
}
