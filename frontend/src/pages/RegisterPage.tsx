import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("passwords_do_not_match");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          full_name: fullName,
          phone,
          password,
          confirm_password: confirmPassword,
        }),
      });
      navigate("/login");
    } catch (err: any) {
      setError(err?.message ?? "register_failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 620, margin: "0 auto" }}>
        <div className="card-header">
          <h2 className="card-title">Register</h2>
          <div className="helper">Create your account</div>
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
              <label>Full name</label>
              <input
                className="input"
                value={fullName}
                onChange={(e: any) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                className="input"
                value={phone}
                onChange={(e: any) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="grid-2">
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
              <div className="field">
                <label>Confirm password</label>
                <input
                  className="input"
                  value={confirmPassword}
                  onChange={(e: any) => setConfirmPassword(e.target.value)}
                  type="password"
                  required
                />
              </div>
            </div>
            <div className="actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "..." : "Register"}
              </button>
            </div>
          </form>
          {error ? <div className="error">{error}</div> : null}
        </div>
      </div>
    </div>
  );
}
