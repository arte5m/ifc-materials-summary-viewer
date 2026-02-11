import { UploadResponse, MaterialGroup } from '../types';

export type { MaterialGroup };

const API_BASE_URL = '/api';

export async function uploadIFC(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
}

export async function getMaterialSummary(fileId: string): Promise<MaterialGroup[]> {
  const response = await fetch(`${API_BASE_URL}/summary/${fileId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get summary' }));
    throw new Error(error.detail || 'Failed to get summary');
  }

  return response.json();
}
