// Type Definitions for API Responses

export interface UploadResponse {
  fileId: string;
  filename: string;
  status: string;
  materialSummary: MaterialGroup[];
}

export interface MaterialGroup {
  materialGroup: string;
  elementCount: number;
  totalArea: number | null;
  totalVolume: number | null;
  density: number | null;
  totalWeight: number | null;
  elementIds: string[];
  missingQuantities: boolean;
}
