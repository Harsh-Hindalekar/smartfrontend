import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../utils/api";
import "./auth.css";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const isStrongPassword = (p) => {
    const hasUpper = /[A-Z]/.test(p);
    const hasLower = /[a-z]/.test(p);
    const hasNumber = /[0-9]/.test(p);
    const hasSpecial = /[^A-Za-z0-9]/.test(p);
    return p.length >= 8 && hasUpper && hasLower && hasNumber && hasSpecial;
  };

  const validate = () => {
    const errs = {};
    const n = name.trim();
    const em = email.trim();
    const u = username.trim();
    const p = password;

    if (!n) errs.name = "Name is required";
    else if (n.length < 2) errs.name = "Name must be at least 2 characters";
    else if (n.length > 50) errs.name = "Name must be max 50 characters";

    if (!em) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) errs.email = "Enter a valid email";

    if (!u) errs.username = "Username is required";
    else if (u.length < 3) errs.username = "Username must be at least 3 characters";
    else if (u.length > 30) errs.username = "Username must be max 30 characters";
    else if (!/^[a-zA-Z0-9_]+$/.test(u)) errs.username = "Only letters, numbers, underscore allowed";

    if (!p) errs.password = "Password is required";
    else if (p.length < 8) errs.password = "Password must be at least 8 characters";
    else if (!isStrongPassword(p))
      errs.password = "Password must have Upper, Lower, Number, Special character";

    if (!confirmPassword) errs.confirmPassword = "Confirm password is required";
    else if (confirmPassword !== password) errs.confirmPassword = "Passwords do not match";

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
      const data = await registerUser(name.trim(), email.trim(), username.trim(), password);
      if (!data.detail && !data.msg && data.id) {
        navigate("/dashboard");
      } else if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        navigate("/dashboard");
      } else {
        setError(data.detail || data.msg || "Registration failed");
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
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join us and start drawing today</p>
        </div>

        {error && <div className="global-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <input
              type="text"
              className="auth-input"
              placeholder="Full Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: "" }));
              }}
              required
              autoComplete="name"
            />
            {fieldErrors.name && <p className="error-text">{fieldErrors.name}</p>}
          </div>

          <div className="input-group">
            <input
              type="email"
              className="auth-input"
              placeholder="Email Address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" }));
              }}
              required
              autoComplete="email"
            />
            {fieldErrors.email && <p className="error-text">{fieldErrors.email}</p>}
          </div>

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
              autoComplete="new-password"
            />
            {fieldErrors.password && (
              <p className="error-text">{fieldErrors.password}</p>
            )}
          </div>

          <div className="input-group">
            <input
              type="password"
              className="auth-input"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword)
                  setFieldErrors((p) => ({ ...p, confirmPassword: "" }));
              }}
              required
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <p className="error-text">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/" className="auth-link">Login</Link>
        </p>
      </div>
    </div>
  );
}
