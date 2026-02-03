// API Response Types

export interface UploadResponse {
  file_id: string;
  filename: string;
  status: string;
}

export interface MaterialGroup {
  material_name: string;
  element_count: number;
  total_area: number | null;
  total_volume: number | null;
  density: number | null;
  total_weight: number | null;
  element_ids: string[];
  has_missing_quantities: boolean;
}

export interface MaterialsSummaryResponse {
  file_id: string;
  material_groups: MaterialGroup[];
}

// UI State Types

export interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export interface ViewerState {
  isLoading: boolean;
  selectedMaterialGroup: string | null;
  highlightMode: 'highlight' | 'xray';
}