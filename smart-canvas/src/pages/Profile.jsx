import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile } from "../utils/api";
import Layout from "../components/Layout";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // UI state
  const [editingField, setEditingField] = useState(null); // "username" | "email" | null
  const [draftUsername, setDraftUsername] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [note, setNote] = useState("");

  // avatar upload (UI only)
  const [avatarUrl, setAvatarUrl] = useState("");
  const fileRef = useRef(null);

  // downloads (dummy UI list - replace with your real list later)
  const [downloads] = useState([
    "export_canvas_01.png",
    "export_canvas_02.png",
    "flipbook_scene_01.mp4",
    "ai_result_sketch.png",
    "export_canvas_03.png",
    "flipbook_scene_02.mp4",
    "export_canvas_04.png",
  ]);

  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const res = await getProfile();
        if (res && res.email) {
          setUser(res);
          setDraftUsername(res.username || "");
          setDraftEmail(res.email || "");
          setLoading(false);
        } else {
          localStorage.removeItem("token");
          navigate("/login");
        }
      } catch (e) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
    fetchUser();
  }, [navigate]);

  // styles (kept inline so you don’t need extra CSS files)
  const styles = useMemo(() => {
    const glass =
      "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(220,235,255,0.72))";
    const border = "1px solid rgba(120,160,220,0.55)";
    const shadow = "0 10px 30px rgba(20,40,80,0.15)";

    return {
      page: {
        display: "flex",
        justifyContent: "center",
        padding: 18,
      },
      frame: {
        width: 920,
        maxWidth: "95vw",
        borderRadius: 22,
        background: "linear-gradient(180deg, #eaf3ff 0%, #d6e7ff 100%)",
        border: "1px solid rgba(120,160,220,0.55)",
        boxShadow: "0 16px 50px rgba(15,35,75,0.18)",
        padding: 18,
        position: "relative",
      },
      inner: {
        borderRadius: 18,
        background: glass,
        border,
        boxShadow: shadow,
        padding: 18,
        position: "relative",
        overflow: "hidden",
      },
      topRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      },
      topBtn: {
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 14,
        border: "1px solid rgba(120,160,220,0.65)",
        background: "linear-gradient(180deg, #ffffff 0%, #e9f2ff 100%)",
        boxShadow: "0 8px 16px rgba(15,35,75,0.10)",
        cursor: "pointer",
        userSelect: "none",
      },
      topLabel: {
        color: "#284a7c",
        fontWeight: 700,
        letterSpacing: 0.4,
      },
      titleStrip: {
        display: "flex",
        justifyContent: "center",
        marginTop: 8,
        marginBottom: 16,
      },
      avatarWrap: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      },
      avatarCircle: {
        width: 130,
        height: 130,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 30% 30%, #f4fbff 0%, #cfe4ff 55%, #b1d0ff 100%)",
        border: "2px solid rgba(110,150,210,0.55)",
        boxShadow: "0 10px 22px rgba(15,35,75,0.15)",
        position: "relative",
        overflow: "hidden",
      },
      avatarImg: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      },
      cameraBtn: {
        position: "absolute",
        right: 8,
        bottom: 8,
        width: 38,
        height: 38,
        borderRadius: 12,
        border: "1px solid rgba(110,150,210,0.65)",
        background: "linear-gradient(180deg, #ffffff 0%, #e9f2ff 100%)",
        boxShadow: "0 8px 16px rgba(15,35,75,0.12)",
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
      },
      editText: {
        fontSize: 14,
        color: "#2c4f85",
        fontWeight: 700,
        letterSpacing: 0.4,
      },
      formArea: {
        marginTop: 14,
        display: "grid",
        gap: 14,
        justifyContent: "center",
      },
      row: {
        width: 620,
        maxWidth: "82vw",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(120,160,220,0.60)",
        background: "linear-gradient(180deg, #ffffff 0%, #e9f2ff 100%)",
        boxShadow: "0 10px 18px rgba(15,35,75,0.08)",
      },
      label: {
        width: 140,
        fontWeight: 800,
        color: "#2a4f86",
        letterSpacing: 0.3,
      },
      value: {
        flex: 1,
        color: "#1d3c66",
        fontWeight: 700,
        opacity: 0.9,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
      input: {
        flex: 1,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(110,150,210,0.65)",
        outline: "none",
        fontSize: 14,
      },
      editBtn: {
        minWidth: 90,
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid rgba(110,150,210,0.65)",
        background: "linear-gradient(180deg, #ffffff 0%, #e9f2ff 100%)",
        boxShadow: "0 8px 16px rgba(15,35,75,0.10)",
        cursor: "pointer",
        fontWeight: 800,
        color: "#2a4f86",
      },
      downloadsBox: {
        marginTop: 18,
        borderRadius: 18,
        border: "1px solid rgba(120,160,220,0.60)",
        background: "linear-gradient(180deg, #ffffff 0%, #e9f2ff 100%)",
        boxShadow: "0 14px 22px rgba(15,35,75,0.10)",
        padding: 14,
      },
      downloadsTitle: {
        textAlign: "center",
        fontWeight: 900,
        color: "#2a4f86",
        letterSpacing: 0.6,
        marginBottom: 10,
      },
      downloadsList: {
        maxHeight: 150,
        overflow: "auto",
        paddingRight: 8,
      },
      dlItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 10px",
        borderRadius: 12,
        border: "1px solid rgba(200,220,255,0.9)",
        background: "rgba(255,255,255,0.75)",
        marginBottom: 8,
      },
      smallBtn: {
        padding: "6px 10px",
        borderRadius: 10,
        border: "1px solid rgba(110,150,210,0.65)",
        background: "linear-gradient(180deg, #ffffff 0%, #e9f2ff 100%)",
        cursor: "pointer",
        fontWeight: 800,
        color: "#2a4f86",
      },
      bottomRow: {
        display: "flex",
        justifyContent: "center",
        gap: 24,
        marginTop: 16,
      },
      bottomBtn: {
        width: 220,
        padding: "12px 16px",
        borderRadius: 14,
        border: "1px solid rgba(110,150,210,0.65)",
        background: "linear-gradient(180deg, #ffffff 0%, #e9f2ff 100%)",
        boxShadow: "0 12px 22px rgba(15,35,75,0.10)",
        cursor: "pointer",
        fontWeight: 900,
        color: "#2a4f86",
        letterSpacing: 0.5,
      },
      note: {
        marginTop: 12,
        textAlign: "center",
        color: "#355c97",
        fontSize: 13,
        opacity: 0.9,
      },
    };
  }, []);

  const validateUsername = (u) => {
    const v = u.trim();
    if (!v) return "Username is required";
    if (v.length < 3) return "Username must be at least 3 characters";
    if (v.length > 30) return "Username must be max 30 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return "Only letters, numbers, underscore allowed";
    return "";
  };

  const validateEmail = (em) => {
    const v = em.trim();
    if (!v) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email";
    return "";
  };

  const onSaveField = (field) => {
    setNote("");
    if (!user) return;

    if (field === "username") {
      const err = validateUsername(draftUsername);
      if (err) return setNote(err);

      // UI-only update (safe, no backend break)
      setUser((u) => ({ ...u, username: draftUsername.trim() }));
      setEditingField(null);
      return setNote("Note: Backend update API not connected yet — UI updated only.");
    }

    if (field === "email") {
      const err = validateEmail(draftEmail);
      if (err) return setNote(err);

      setUser((u) => ({ ...u, email: draftEmail.trim() }));
      setEditingField(null);
      return setNote("Note: Backend update API not connected yet — UI updated only.");
    }
  };

  const onPickAvatar = () => fileRef.current?.click();
  const onAvatarFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
    setNote("Note: Avatar is preview only (not uploaded to backend yet).");
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: 20 }}>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.frame}>
          <div style={styles.inner}>
            {/* Top row */}
            <div style={styles.topRow}>
              <div>
                <button style={styles.topBtn} onClick={() => navigate(-1)}>
                  <span style={{ fontSize: 18 }}>←</span>
                  <span style={styles.topLabel}>BACK</span>
                </button>
              </div>

              <div>
                <button
                  style={styles.topBtn}
                  onClick={() => setNote("Settings screen not added yet (UI hook ready).")}
                >
                  <span style={{ fontSize: 18 }}>⚙️</span>
                  <span style={styles.topLabel}>SETTING</span>
                </button>
              </div>
            </div>

            {/* Avatar */}
            <div style={styles.titleStrip}>
              <div style={styles.avatarWrap}>
                <div style={styles.avatarCircle}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" style={styles.avatarImg} />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        color: "rgba(40,80,140,0.35)",
                        fontSize: 56,
                        fontWeight: 900,
                      }}
                    >
                      👤
                    </div>
                  )}

                  <button style={styles.cameraBtn} onClick={onPickAvatar} title="Change photo">
                    📷
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => onAvatarFile(e.target.files?.[0])}
                  />
                </div>
                <div style={styles.editText}>EDIT</div>
              </div>
            </div>

            {/* Editable fields */}
            <div style={styles.formArea}>
              <div style={styles.row}>
                <div style={styles.label}>USERNAME</div>

                {editingField === "username" ? (
                  <input
                    style={styles.input}
                    value={draftUsername}
                    onChange={(e) => setDraftUsername(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <div style={styles.value}>{user?.username || "—"}</div>
                )}

                {editingField === "username" ? (
                  <button style={styles.editBtn} onClick={() => onSaveField("username")}>
                    Save
                  </button>
                ) : (
                  <button style={styles.editBtn} onClick={() => setEditingField("username")}>
                    Edit
                  </button>
                )}
              </div>

              <div style={styles.row}>
                <div style={styles.label}>EMAIL</div>

                {editingField === "email" ? (
                  <input
                    style={styles.input}
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <div style={styles.value}>{user?.email || "—"}</div>
                )}

                {editingField === "email" ? (
                  <button style={styles.editBtn} onClick={() => onSaveField("email")}>
                    Save
                  </button>
                ) : (
                  <button style={styles.editBtn} onClick={() => setEditingField("email")}>
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Downloads */}
            <div style={styles.downloadsBox}>
              <div style={styles.downloadsTitle}>DOWNLOADS</div>
              <div style={styles.downloadsList}>
                {downloads.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#3a5f99", padding: 16 }}>
                    No downloads yet
                  </div>
                ) : (
                  downloads.map((d, idx) => (
                    <div key={idx} style={styles.dlItem}>
                      <div style={{ color: "#1e3a66", fontWeight: 800 }}>{d}</div>
                      <button
                        style={styles.smallBtn}
                        onClick={() => setNote("Download open not wired yet (connect backend later).")}
                      >
                        Open
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom buttons */}
            <div style={styles.bottomRow}>
              <button
                style={styles.bottomBtn}
                onClick={() => setNote("About Us page not added yet (route ready).")}
              >
                ABOUT US
              </button>
              <button
                style={styles.bottomBtn}
                onClick={() => setNote("Help page not added yet (route ready).")}
              >
                HELP
              </button>
            </div>

            {/* Note / helper text */}
            {note && <div style={styles.note}>{note}</div>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
