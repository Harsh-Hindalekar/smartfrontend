import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../utils/api";
import "./auth.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    const u = username.trim();
    const p = password;

    if (!u) errs.username = "Username is required";
    else if (u.length < 3) errs.username = "Username must be at least 3 characters";
    else if (u.length > 30) errs.username = "Username must be max 30 characters";
    else if (!/^[a-zA-Z0-9_]+$/.test(u)) errs.username = "Only letters, numbers, underscore allowed";

    if (!p) errs.password = "Password is required";
    else if (p.length < 6) errs.password = "Password must be at least 6 characters";
    else if (p.length > 64) errs.password = "Password must be max 64 characters";

    return errs;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser(username.trim(), password);

      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        navigate("/dashboard");
      } else {
        setError(data.detail || data.msg || "Login failed");
      }
    } catch (err) {
      setError("Network or server error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Please enter your details to sign in</p>
        </div>

        {error && <div className="global-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <input
              type="text"
              className="auth-input"
              placeholder="Username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: "" }));
              }}
              required
              autoComplete="username"
            />
            {fieldErrors.username && (
              <p className="error-text">{fieldErrors.username}</p>
            )}
          </div>

          <div className="input-group">
            <input
              type="password"
              className="auth-input"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: "" }));
              }}
              required
              autoComplete="current-password"
            />
            {fieldErrors.password && (
              <p className="error-text">{fieldErrors.password}</p>
            )}
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="auth-footer">
          Don’t have an account? <Link to="/register" className="auth-link">Register</Link>
        </p>
      </div>
    </div>
  );
}
