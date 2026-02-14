import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getProfile } from "../utils/api";
import "./Dashboard.css";

// Put these images in: src/assets/dashboard/
import settingIco from "../assets/setting.png";

import airImg from "../assets/air1.png";
import smartImg from "../assets/smart.png";
import flipImg from "../assets/flip.png";

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

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>;

  return (
    <div className="dbWrap">
      <div className="dbShell">
        {/* Top Left - Setting */}
        <Link to="/settings" className="dbTopLink dbLeft">
          <div className="dbTopIcon">
            <img src={settingIco} alt="Setting" />
          </div>
          <div className="dbTopText">Setting</div>
        </Link>
        
        {/* Title Ribbon */}
        <div className="dbTitleRow">
          <div className="dbRibbon">
            <span>Dashboard</span>
          </div>
        </div>

        {/* Tiles */}
        <div className="dbTiles">
          <Link to="/webcam-drawing" className="dbTile tAir">
            <div className="dbTileImg">
              <img src={airImg} alt="Air drawing" />
            </div>
            <div className="dbTileLabel">Air drawing</div>
          </Link>

          <Link to="/ai-drawing" className="dbTile tSmart">
            <div className="dbTileImg">
              <img src={smartImg} alt="Smart canva" />
            </div>
            <div className="dbTileLabel light">Smart canva</div>
          </Link>

          <Link to="/flipbook" className="dbTile tFlip">
            <div className="dbTileImg">
              <img src={flipImg} alt="Flipabook" />
            </div>
            <div className="dbTileLabel">Flipabook</div>
          </Link>
        </div>

        {/* Bottom Buttons */}
        <div className="dbBottomBtns">
          <Link to="/about" className="dbBtn">ABOUT US</Link>
          <Link to="/help" className="dbBtn">HELP</Link>
        </div>

        {/* Logout (kept, minimal) */}
        {user ? (
          <button
            className="dbLogout"
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/login");
            }}
          >
            Logout
          </button>
        ) : null}
      </div>
    </div>
  );
}
