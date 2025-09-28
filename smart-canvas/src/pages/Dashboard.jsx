import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getProfile } from "../utils/api";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await getProfile();

        if (res?.email) {
          setUser(res);
        } else {
          throw new Error("Invalid token");
        }
      } catch (err) {
        console.error("Profile fetch failed:", err);
        localStorage.removeItem("token");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [navigate]);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>

      {user ? (
        <>
          <p>Welcome, <strong>{user.name || "User"}</strong>!</p>
          <p>Email: {user.email}</p>

          <nav>
            <ul>
              <li><Link to="/webcam-drawing">🎨 Webcam Drawing</Link></li>
              <li><Link to="/ai-drawing">🤖 AI Drawing</Link></li>
              <li><Link to="/flipbook">📖 Flipbook</Link></li>
              <li><Link to="/profile">👤 Profile</Link></li>
            </ul>
          </nav>

          <button
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/login");
            }}
            style={{ marginTop: "20px" }}
          >
            Logout
          </button>
        </>
      ) : (
        <p>Redirecting...</p>
      )}
    </div>
  );
}
