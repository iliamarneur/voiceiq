import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// One-shot public routes (no auth)
export const getPublicPlans = () => api.get('/plans');
export const getOneshotTiers = () => api.get('/oneshot/tiers');
export const estimateOneshot = (durationSeconds: number) =>
  api.post('/oneshot/estimate', { duration_seconds: durationSeconds });
export const createOneshotOrder = (tier: string, durationSeconds: number) =>
  api.post('/oneshot/order', { tier, duration_seconds: durationSeconds });
export const uploadOneshotFile = (formData: FormData) =>
  api.post('/oneshot/upload', formData);
export const getJobStatus = (jobId: string) =>
  api.get(`/jobs/${jobId}`);
export const getTranscription = (id: string) =>
  api.get(`/transcriptions/${id}`);
export const exportTranscription = (id: string, format: string) =>
  api.get(`/transcriptions/${id}/export/${format}`, { responseType: 'blob' });
