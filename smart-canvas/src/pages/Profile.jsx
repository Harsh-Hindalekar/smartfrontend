import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile } from "../utils/api";
import Layout from "../components/Layout";

export default function Profile() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUser() {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await getProfile();
      if (res && res.email) {
        setUser(res);
      } else {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
    fetchUser();
  }, [navigate]);

  return (
    <Layout>
      <h2>Profile</h2>
      {user ? (
        <div>
          <p>
            <strong>Name:</strong> {user.name}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </Layout>
  );
}
