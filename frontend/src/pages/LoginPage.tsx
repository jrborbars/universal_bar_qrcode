import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, TokenResponse } from "../api";
import { setToken } from "../auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await apiFetch<TokenResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(token.access_token);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "login_failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="card-header">
          <h2 className="card-title">Login</h2>
          <div className="helper">Access your dashboard</div>
        </div>
        <div className="card-body">
          <form onSubmit={onSubmit} className="stack">
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                type="email"
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                className="input"
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
                type="password"
                required
              />
            </div>
            <div className="actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "..." : "Login"}
              </button>
            </div>
          </form>
          {error ? <div className="error">{error}</div> : null}
        </div>
      </div>
    </div>
  );
}
