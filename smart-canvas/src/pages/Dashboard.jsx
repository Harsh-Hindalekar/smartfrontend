import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getProfile } from "../utils/api";
import "./Dashboard.css";

// Icons & Assets
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

  if (loading) return <div className="dbWrap">Loading...</div>;

  return (
    <div className="dbWrap">
      <div className="dbShell">
        
        {/* Top Left Setting - Based on sketch */}
        <Link to="/settings" className="dbTopLink">
          <div className="dbTopIcon">
             <img src={settingIco} alt="setting" />
          </div>
          <div className="dbTopText">setting</div>
        </Link>

        {/* The Yellow Dashboard Ribbon from the second image */}
        <div className="dbTitleRow">
          <div className="dbRibbon">
            <span>Dashboard</span>
          </div>
        </div>

        {/* Colorful Tiles Grid */}
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
            <div className="dbTileLabel">smart canva</div>
          </Link>

          <Link to="/flipbook" className="dbTile tFlip">
            <div className="dbTileImg">
              <img src={flipImg} alt="Flipabook" />
            </div>
            <div className="dbTileLabel">flipabook</div>
          </Link>
        </div>

        {/* Floating Logout Button */}
        <button className="dbLogout" onClick={() => {
          localStorage.removeItem("token");
          navigate("/login");
        }}>Logout</button>

      </div>
    </div>
  );
}