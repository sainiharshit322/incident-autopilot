import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

let dynamicToken = null;

export const authenticate = async () => {
  if (!dynamicToken) {
    // We use a fresh axios instance to avoid circular interceptor calls
    const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/token?subject=frontend-client`);
    dynamicToken = res.data.token;
  }
  return dynamicToken;
};

api.interceptors.request.use(async (config) => {
  try {
    const token = await authenticate();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Failed to authenticate dynamically", error);
  }
  return config;
});

export const getIncidents = () => api.get('/api/v1/incidents').then((r) => r.data);
export const getIncident = (id) => api.get(`/api/v1/incidents/${id}`).then((r) => r.data);
export const patchIncidentStatus = (id, status) =>
  api.patch(`/api/v1/incidents/${id}/runbook`, { status }).then((r) => r.data);
export const patchIncidentStatusWithNote = (id, status, resolutionNote) =>
  api.patch(`/api/v1/incidents/${id}/status`, { status, resolutionNote }).then((r) => r.data);
export const closeIncidentAi = (id) =>
  api.post(`/api/v1/incidents/${id}/close`).then((r) => r.data);