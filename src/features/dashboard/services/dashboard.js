import { apiRequest } from '../../../shared/lib/api';

export function getRevisiDashboard() {
  return apiRequest('/revisi/dashboard').then((response) => response?.data || response);
}
