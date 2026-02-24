// src/utils/api.js

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Export API base for components that need it
export const API_BASE_URL = API_URL;

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return { detail: "Invalid server response" };
  }
}

async function apiCall(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  console.log('API Request:', `${API_URL}${endpoint}`, config);

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, config);
  } catch (err) {
    return { detail: "Network error / server not reachable" };
  }

  const data = await safeJson(response);

  if (!response.ok) {
    return data?.detail ? data : { detail: "Request failed" };
  }

  return data;
}

// ========== AUTH FUNCTIONS ==========

export async function loginUser(username, password) {
  // frontend safety (won't break)
  const u = (username || "").trim();

  const formData = new URLSearchParams();
  formData.append('username', u);
  formData.append('password', password || "");

  let response;
  try {
    response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });
  } catch (err) {
    return { detail: "Network error / server not reachable" };
  }

  const data = await safeJson(response);

  if (!response.ok) {
    return data?.detail ? data : { detail: "Login failed" };
  }

  return data;
}

export async function registerUser(name, email, username, password) {
  return apiCall('/register', 'POST', { name, email, username, password });
}

export async function getProfile() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  return apiCall('/user/profile', 'GET', null, token);
}

// ========== AI DRAWING RECOGNITION ==========

export async function recognizeGoogle(points) {
  const token = localStorage.getItem("token");
  return apiCall('/recognize_google', 'POST', { points }, token);
}

// ========== FLIPBOOK HELPERS ==========

export async function smoothStroke(strokes) {
  const token = localStorage.getItem('token');

  if (API_URL) {
    try {
      return await apiCall('/smooth_stroke', 'POST', { strokes }, token);
    } catch (err) {
      console.warn('smoothStroke: backend call failed, using fallback', err);
    }
  }

  return { points: strokes.map(s => (typeof s === 'string' ? s.trim() : String(s))) };
}
