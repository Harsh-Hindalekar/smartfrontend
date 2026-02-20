import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../utils/api";
import "./Auth1.css"; // Ensure your CSS uses the .auth-page centering logic

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
    if (!name.trim()) errs.name = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    if (!username.trim()) errs.username = "Username is required";
    if (password.length < 8) errs.password = "Password must be at least 8 characters";
    if (!isStrongPassword(password)) errs.password = "Password is too weak";
    if (confirmPassword !== password) errs.confirmPassword = "Passwords do not match";
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
      // Adjusted call to match your state (name, email, username, password)
      const data = await registerUser(name.trim(), email.trim(), username.trim(), password);
      
      // FIX FOR THE OBJECT ERROR: Extract the message if it's a 422 object
      if (data.detail) {
        const msg = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
        setError(msg); 
      } else if (data.id || data.access_token) {
        if (data.access_token) localStorage.setItem("token", data.access_token);
        navigate("/dashboard");
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
          <h3 className="auth-title-login">ALL IN ONE CREATIVE CANVA</h3>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate className="auth-form">
          <div className="auth-field">
            <label>NAME :</label>
            <input
              className={`auth-input ${fieldErrors.name ? 'error' : ''}`}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors(p => ({ ...p, name: "" }));
              }}
            />
            {fieldErrors.name && <div className="field-error">{fieldErrors.name}</div>}
          </div>

          <div className="auth-field">
            <label>USERNAME :</label>
            <input
              className={`auth-input ${fieldErrors.username ? 'error' : ''}`}
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors(p => ({ ...p, username: "" }));
              }}
            />
            {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
          </div>

          <div className="auth-field">
            <label>EMAIL :</label>
            <input
              className={`auth-input ${fieldErrors.email ? 'error' : ''}`}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: "" }));
              }}
            />
            {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
          </div>

          <div className="auth-field">
            <label>PASSWORD :</label>
            <input
              className={`auth-input ${fieldErrors.password ? 'error' : ''}`}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: "" }));
              }}
            />
            {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
          </div>

          <div className="auth-field">
            <label>CONFIRM PASSWORD :</label>
            <input
              className={`auth-input ${fieldErrors.confirmPassword ? 'error' : ''}`}
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) setFieldErrors(p => ({ ...p, confirmPassword: "" }));
              }}
            />
            {fieldErrors.confirmPassword && <div className="field-error">{fieldErrors.confirmPassword}</div>}
          </div>

          <button type="submit" disabled={loading} className="auth-btn-sketch">
            {loading ? "..." : "REGISTER"}
          </button>
        </form>

        <div className="auth-footer">
          <Link className="auth-link" to="/">LOGIN</Link>
        </div>
      </div>
    </div>
  );
}