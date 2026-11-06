// Wraps instructor pages with the shared header and sign-out action.
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { Button } from "./Button";
import { ErrorState } from "./States";

export function InstructorLayout({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  async function logout() {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch {
      setError(true);
    }
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link className="brand" to="/dashboard">
            Classroom Survey
          </Link>
          <div className="header-actions">
            <span>{session?.user.email}</span>
            <Button variant="secondary" onClick={() => void logout()}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="container">
        {error && <ErrorState error="Could not sign out. Please try again." />}
        {children}
      </main>
    </>
  );
}
