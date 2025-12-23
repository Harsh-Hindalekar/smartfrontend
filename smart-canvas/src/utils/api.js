// src/utils/api.js

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Export API base for components that need it
export const API_BASE_URL = API_URL;

async function apiCall(endpoint, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  console.log('API Request:', `${API_URL}${endpoint}`, config);

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();

  return data;
}

// ========== AUTH FUNCTIONS ==========

export async function loginUser(username, password) {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  const data = await response.json();
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

  // Try backend if API_URL is set
  if (API_URL) {
    try {
      return await apiCall('/smooth_stroke', 'POST', { strokes }, token);
    } catch (err) {
      console.warn('smoothStroke: backend call failed, using fallback', err);
    }
  }

  // Client-side fallback
  return { points: strokes.map(s => (typeof s === 'string' ? s.trim() : String(s))) };
}