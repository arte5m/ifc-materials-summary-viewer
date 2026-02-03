import axios, { AxiosInstance } from 'axios';
import { MaterialsSummaryResponse, UploadResponse } from '../types/index';

// Base API configuration
const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// API service functions
export const api = {
  /**
   * Upload an IFC file
   */
  uploadIFC: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<UploadResponse>(
      '/api/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  /**
   * Get materials summary for an uploaded file
   */
  getMaterialsSummary: async (
    fileId: string,
    density?: number
  ): Promise<MaterialsSummaryResponse> => {
    const params = density ? { density } : {};
    
    const response = await apiClient.get<MaterialsSummaryResponse>(
      `/api/materials/${fileId}`,
      { params }
    );

    return response.data;
  },

  /**
   * Export materials summary as CSV
   */
  exportCSV: async (fileId: string): Promise<Blob> => {
    const response = await apiClient.get(`/api/export/${fileId}`, {
      responseType: 'blob',
    });

    return response.data;
  },

  /**
   * Health check endpoint
   */
  healthCheck: async (): Promise<{ status: string }> => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

// Export axios instance for custom requests if needed
export default apiClient;