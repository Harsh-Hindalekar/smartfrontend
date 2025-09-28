import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../utils/api";


export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await registerUser(name, email, username, password);
      console.log("Register response:", data);
      // Backend does not return access_token on register, so just redirect if no error
      if (!data.detail && !data.msg && data.id) {
        navigate("/dashboard");
      } else if (data.access_token) {
        // In case backend is changed to return token
        localStorage.setItem("token", data.access_token);
        navigate("/dashboard");
      } else {
        setError(data.detail || data.msg || "Registration failed");
      }
    } catch (err) {
      setError("Network or server error");
      console.error("Register error:", err);
    }
  }

  return (
    <div style={{ maxWidth: "400px", margin: "auto", padding: "20px" }}>
      <h2>Register</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          style={{ display: "block", margin: "10px 0", width: "100%" }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={{ display: "block", margin: "10px 0", width: "100%" }}
        />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          style={{ display: "block", margin: "10px 0", width: "100%" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          style={{ display: "block", margin: "10px 0", width: "100%" }}
        />
        <button type="submit" style={{ width: "100%", padding: "10px" }}>
          Register
        </button>
      </form>
      <p style={{ marginTop: "10px" }}>
        Already have an account? <Link to="/">Login</Link>
      </p>
    </div>
  );
}
