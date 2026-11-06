import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/ui/Button";
import { ErrorState } from "../components/ui/States";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await signIn(email, password);
      const from = location.state?.from;
      navigate(
        from?.pathname
          ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
          : "/dashboard",
        { replace: true },
      );
    } catch (err) {
      setError(
        (err as { code?: string }).code === "NETWORK_ERROR"
          ? "Could not connect. Check your internet connection and try again."
          : "Could not sign in. Check your email and password and try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="center-page">
      <div className="login">
        <Link to="/">Classroom Survey</Link>
        <h1>Instructor Login</h1>
        <form onSubmit={(event) => void submit(event)}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && <ErrorState error={error} />}
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in..." : "Log In"}
          </Button>
        </form>
      </div>
    </main>
  );
}
