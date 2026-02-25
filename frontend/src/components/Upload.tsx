import React, { useState } from 'react';
import { ValidationResponse } from '../types';

interface UploadProps {
  onUpload: (file: File) => Promise<void>;
  onValidate?: () => Promise<void>;
  isLoading: boolean;
  isValiding?: boolean;
  error: string | null;
  validationResult?: ValidationResponse | null;
  hasFile: boolean;
}

export function Upload({ onUpload, onValidate, isLoading, isValiding, error, validationResult, hasFile }: UploadProps) {
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

  return (
    <div className="upload-container">
      <div className="upload-form">
        <label className="upload-label">
          <span className="upload-text">Select IFC file:</span>
          <input
            type="file"
            accept=".ifc"
            onChange={handleFileChange}
            disabled={isLoading}
            className="upload-input-visible"
          />
        </label>

        {selectedFile && (
          <div className="file-info">
            <span className="file-name">{selectedFile.name}</span>
            <span className="file-size">
              ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </span>
            <div className="button-group">
              <button
                className={`upload-button ${isLoading ? 'upload-button-disabled' : ''}`}
                onClick={handleUpload}
                disabled={isLoading}
              >
                {isLoading ? 'Uploading...' : 'Upload'}
              </button>
              {onValidate && (
                <button
                  className={`validate-button ${isValiding ? 'validate-button-disabled' : ''}`}
                  onClick={onValidate}
                  disabled={isLoading || isValiding || !hasFile}
                >
                  {isValiding ? 'Validating...' : 'Validate'}
                </button>
              )}
            </div>
            {validationResult && (
              <span 
                className={`validation-message ${validationResult.valid ? 'success' : 'error'}`}
                title={
                  validationResult.valid 
                    ? 'IFC file passed schema validation'
                    : `${validationResult.errorCount} validation errors found. Click "View Errors" for details.`
                }
              >
                {validationResult.message}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="upload-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {validationResult && validationResult.errors && validationResult.errors.length > 0 && (
        <div className="validation-details">
          <details>
            <summary>View Errors ({validationResult.errors.length})</summary>
            <ul>
              {validationResult.errors.map((error, idx) => (
                <li key={idx}>{error.message}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
