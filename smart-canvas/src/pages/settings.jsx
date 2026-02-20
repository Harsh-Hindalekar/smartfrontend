import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getProfile } from "../utils/api";
import "./Dashboard.css"; // Reuse dashboard styles for consistency

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await getProfile();
        if (res?.email) setUser(res);
        else throw new Error("Invalid token");
      } catch (err) {
        localStorage.removeItem("token");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (loading) return <div className="dbWrap">Loading...</div>;

  return (
    <div className="dbWrap">
      <div className="dbShell">
        {/* Back to Dashboard Link */}
        <Link to="/dashboard" className="dbTopLink">
          <div className="dbTopIcon" style={{fontSize: '24px'}}>←</div>
          <div className="dbTopText">back</div>
        </Link>

        {/* Settings Title Ribbon */}
        <div className="dbTitleRow">
          <div className="dbRibbon">
            <span>Settings</span>
          </div>
        </div>

        {/* Settings Options Grid */}
        <div className="dbTiles">
          {/* How It Works Option */}
          <div className="dbTile tAir" style={{cursor: 'pointer'}} onClick={() => navigate("/help")}>
            <div className="dbTileLabel">How it works</div>
            <p style={{fontSize: '0.9rem', padding: '0 10px'}}>Learn to use the Canva</p>
          </div>

          {/* Theme Option */}
          <div className="dbTile tSmart" style={{cursor: 'pointer'}}>
            <div className="dbTileLabel">Theme</div>
            <p style={{fontSize: '0.9rem', padding: '0 10px'}}>Switch Light/Dark</p>
          </div>

          {/* Logout Option */}
          <div className="dbTile tFlip" style={{cursor: 'pointer'}} onClick={handleLogout}>
            <div className="dbTileLabel">Logout</div>
            <p style={{fontSize: '0.9rem', padding: '0 10px'}}>Exit your account</p>
          </div>
        </div>

        {/* Profile Info Footer */}
        <div style={{marginTop: '40px', textAlign: 'center', fontWeight: '800'}}>
          Logged in as: <span style={{color: '#357fe0'}}>{user?.username || user?.email}</span>
        </div>
      </div>
    </div>
  );
}