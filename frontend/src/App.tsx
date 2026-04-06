import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { clearToken, getToken } from "./auth";
import CodePage from "./pages/CodePage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  const navigate = useNavigate();
  const token = getToken();
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const existing = document.documentElement.dataset.theme;
    return existing === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("betterdays_theme", theme);
  }, [theme]);

  return (
    <div className="app-shell">
      <div className="container">
        <header className="topbar">
          <Link to="/" className="brand">
            <span className="brand-badge" />
            BetterDays
          </Link>

          <nav className="nav">
            <NavLink
              to="/"
              className={({ isActive }) => `pill ${isActive ? "pill-active" : ""}`}
            >
              Home
            </NavLink>
            <NavLink
              to="/login"
              className={({ isActive }) => `pill ${isActive ? "pill-active" : ""}`}
            >
              Login
            </NavLink>
            <NavLink
              to="/register"
              className={({ isActive }) => `pill ${isActive ? "pill-active" : ""}`}
            >
              Register
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `pill ${isActive ? "pill-active" : ""}`}
            >
              Dashboard
            </NavLink>
            <button
              type="button"
              className="btn"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            {token ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  clearToken();
                  navigate("/login");
                }}
              >
                Logout
              </button>
            ) : null}
          </nav>
        </header>

        <main className="content">
          <Routes>
            <Route
              path="/"
              element={
                <section className="hero">
                  <h1>Orange QR Registry</h1>
                  <p>
                    Create companies, generate unique codes (S2 + UUIDv7 + UUIDv4), and
                    share them via QR.
                  </p>
                </section>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/c/:code" element={<CodePage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
