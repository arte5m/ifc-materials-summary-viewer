/**
 * Helper function to trigger browser download of a blob
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Download CSV for a given file ID
 */
export const downloadMaterialsCSV = async (
  fileId: string,
  filename?: string
): Promise<void> => {
  try {
    const { api } = await import('./api');
    const blob = await api.exportCSV(fileId);
    const csvFilename = filename || `materials_${fileId}.csv`;
    downloadBlob(blob, csvFilename);
  } catch (error) {
    console.error('Failed to download CSV:', error);
    throw error;
  }
};