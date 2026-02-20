import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../utils/api";
import "./Auth.css";

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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo" />
          <h3 className="auth-title-login">ALL IN ONE CREATIVE</h3>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <div className="auth-field">
            <label>USERNAME :</label>
            <input
              className={`auth-input ${fieldErrors.username ? 'error' : ''}`}
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: "" }));
              }}
              required
              autoComplete="username"
            />
            {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
          </div>

          <div className="auth-field">
            <label>PASSWORD :</label>
            <input
              className={`auth-input ${fieldErrors.password ? 'error' : ''}`}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: "" }));
              }}
              required
              autoComplete="current-password"
            />
            {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
          </div>

          <button type="submit" disabled={loading} className="auth-btn-login">
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>

        <div className="auth-footer">
          <Link className="auth-link" to="/register">REGISTER</Link>
        </div>
      </div>
    </div>
  );
}