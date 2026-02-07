// API Client Functions
// All backend communication for IFC processing

import { UploadResponse, MaterialGroup } from '../types';

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

export async function exportCSV(fileId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/export/${fileId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Export failed' }));
    throw new Error(error.detail || 'Export failed');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `materials_${fileId}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function getMaterialSummary(fileId: string): Promise<MaterialGroup[]> {
  const response = await fetch(`${API_BASE_URL}/summary/${fileId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get summary' }));
    throw new Error(error.detail || 'Failed to get summary');
  }

  return response.json();
}

export async function getGLB(fileId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/glb/${fileId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to load 3D model' }));
    throw new Error(error.detail || 'Failed to load 3D model');
  }

  return response.blob();
}

export async function getGLBElementIds(fileId: string): Promise<{
  meshToExpressId: Record<string, number>;
  expressIdToMesh: Record<number, number[]>;
}> {
  const response = await fetch(`${API_BASE_URL}/glb/${fileId}/ids`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to load element IDs' }));
    throw new Error(error.detail || 'Failed to load element IDs');
  }

  return response.json();
}
