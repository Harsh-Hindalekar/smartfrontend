import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../utils/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // NEW
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const navigate = useNavigate();

  // NEW: simple validators
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
    <div style={{ maxWidth: "400px", margin: "auto", padding: "20px" }}>
      <h2>Login</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: "" }));
          }}
          required
          autoComplete="username"
          style={{ display: "block", margin: "10px 0", width: "100%" }}
        />
        {fieldErrors.username && (
          <p style={{ color: "red", marginTop: -6, marginBottom: 8 }}>{fieldErrors.username}</p>
        )}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: "" }));
          }}
          required
          autoComplete="current-password"
          style={{ display: "block", margin: "10px 0", width: "100%" }}
        />
        {fieldErrors.password && (
          <p style={{ color: "red", marginTop: -6, marginBottom: 8 }}>{fieldErrors.password}</p>
        )}

        <button type="submit" disabled={loading} style={{ width: "100%", padding: "10px" }}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p style={{ marginTop: "10px" }}>
        Don’t have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
