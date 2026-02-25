// Type Definitions for API Responses

export interface UploadResponse {
  fileId: string;
  filename: string;
  status: string;
}

export interface MaterialGroup {
  materialGroup: string;
  hasMaterial: number;
  elementClass: string | null;
  elementCount: number;
  totalArea: number | null;
  totalVolume: number | null;
  density: number | null;
  totalWeight: number | null;
  elementIds: string[];
  missingQuantities: boolean;
}

export interface ValidationErrorDetail {
  level: number;
  message: string;
  instance: string;
}

export interface ValidationResponse {
  valid: boolean;
  message: string;
  errorCount: number;
  warningCount: number;
  errors: ValidationErrorDetail[];
  warnings: ValidationErrorDetail[];
}
