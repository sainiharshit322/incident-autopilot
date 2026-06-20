import apiClient from './apiClient';

export const getIncidents = async () => {
  const { data } = await apiClient.get('/incidents');
  return data;
};

export const getIncidentById = async (id) => {
  const { data } = await apiClient.get(`/incidents/${id}`);
  return data;
};

export const patchIncidentRunbook = async (id, payload) => {
  // payload: { rootCause, runbookDraft, confidenceScore, status }
  const { data } = await apiClient.patch(`/incidents/${id}`, payload);
  return data;
};

export const patchIncidentStatus = async (id, status, resolutionNote = '') => {
  const { data } = await apiClient.patch(`/incidents/${id}/status`, { status, resolutionNote });
  return data;
};

export const closeIncidentAi = async (id) => {
  const { data } = await apiClient.post(`/incidents/${id}/close`);
  return data;
};
