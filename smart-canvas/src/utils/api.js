// src/utils/api.jsx

const API_URL = import.meta.env.VITE_API_URL;

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

  // Log the API request for debugging
  console.log('API Request:', `${API_URL}${endpoint}`, config);

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    return data;
  }

  return data;
}


// Login expects username and password as form data, endpoint is /login
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


// Register expects name, email, username, password as JSON, endpoint is /register
export async function registerUser(name, email, username, password) {
  return apiCall('/register', 'POST', { name, email, username, password });
}

export async function getProfile() {
  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }
  return apiCall('/user/profile', 'GET', null, token);
}

export async function recognizeShape(points) {
  const token = localStorage.getItem('token');
  return apiCall('/recognize', 'POST', { points }, token);
}

export async function smoothStroke(points) {
  const token = localStorage.getItem('token');
  return apiCall('/smooth_stroke', 'POST', { points }, token);
}