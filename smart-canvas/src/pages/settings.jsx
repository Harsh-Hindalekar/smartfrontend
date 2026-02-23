import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getProfile } from "../utils/api";
import "./Dashboard.css"; // Reuse dashboard styles for consistency

export default function Settings() {
  const [user, setUser] = useState(null);
  const [showHow, setShowHow] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("theme") || "light";
    } catch (e) {
      return "light";
    }
  });
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

  useEffect(() => {
    try {
      document.documentElement.classList.toggle("dark", theme === "dark");
      localStorage.setItem("theme", theme);
    } catch (e) {
      // ignore (server-side rendering or restricted storage)
    }
  }, [theme]);

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
          <div className="dbTile tAir" style={{cursor: 'pointer'}} onClick={() => setShowHow(true)}>
            <div className="dbTileLabel">How it works</div>
            <p style={{fontSize: '0.9rem', padding: '0 10px'}}>Learn to use the Canva</p>
          </div>

          {showHow && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1200,
                padding: '20px',
              }}
              onClick={() => setShowHow(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                style={{
                  background: '#fff',
                  color: '#111',
                  maxWidth: 760,
                  width: '100%',
                  borderRadius: 8,
                  padding: 20,
                  boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <h2 style={{margin: 0}}>How it works — Quick guide</h2>
                  <button onClick={() => setShowHow(false)} style={{marginLeft: 12}}>Close</button>
                </div>

                <div style={{marginTop: 12, lineHeight: 1.5}}>
                  <p><strong>AI Drawing:</strong> Describe a shape or scene and the AI will generate vector-like sketches you can refine on the canvas.</p>
                  <p><strong>Flipbook:</strong> Create frame-by-frame animations using the timeline and lightbox; export as GIF or sequence when done.</p>
                  <p><strong>Webcam Drawing:</strong> Capture gestures from your webcam to draw in real time — useful for motion-based sketches and practice.</p>
                  <p><strong>Canvas & Tools:</strong> Use the left toolbar for drawing/eraser/shape tools and the right panel for layers, colors, and properties.</p>
                  <p><strong>Export & Save:</strong> Save projects to your account, export images/animations, and use clipboard/tools to move content between features.</p>
                  <p><strong>Account & Settings:</strong> Manage your profile, sign out from Settings, and toggle themes from the dashboard (where available).</p>
                </div>
              </div>
            </div>
          )}

          {/* Theme Option */}
          <div className="dbTile tSmart" style={{cursor: 'pointer'}} onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}>
            <div className="dbTileLabel">Theme</div>
            <p style={{fontSize: '0.9rem', padding: '0 10px'}}>{theme === 'dark' ? 'Dark mode (click to switch)' : 'Light mode (click to switch)'}</p>
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