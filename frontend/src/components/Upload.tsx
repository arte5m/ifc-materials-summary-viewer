import React, { useState } from 'react';

interface UploadProps {
  onUpload: (file: File) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function Upload({ onUpload, isLoading, error }: UploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith('.ifc')) {
        setSelectedFile(file);
      }
    }
  };

  const handleUpload = async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
    }
  };

  if (isLoading) {
    return (
      <div className="upload-container">
        <div className="upload-loading">
          <div className="spinner"></div>
          <p>Processing IFC file...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-container">
      <div className="upload-form">
        <label className="upload-label">
          <span className="upload-text">Select IFC file:</span>
          <input
            type="file"
            accept=".ifc"
            onChange={handleFileChange}
            className="upload-input-visible"
          />
        </label>

        {selectedFile && (
          <div className="file-info">
            <span className="file-name">{selectedFile.name}</span>
            <span className="file-size">
              ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </span>
            <button className="upload-button" onClick={handleUpload}>
              Upload
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="upload-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
