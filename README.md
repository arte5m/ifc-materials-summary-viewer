# IFC Materials Summary Viewer

A full-stack web application for loading IFC (Industry Foundation Classes) files, extracting material information, and visualizing elements in 3D with material-based selection and filtering.

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **npm**

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Start Backend Server
```bash
cd backend
fastapi dev app/main.py
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### Start Frontend Development Server
```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`


## Implementation Notes

### Material Grouping Strategy

Materials are grouped using the following priority:

1. Material Name (IfcMaterial.Name) - Preferred
2. Material Type (IfcMaterial.MaterialType) - Fallback
3. "Unassigned" - For elements without material assignments

### Quantity Extraction

Quantities are extracted from:

1. Direct quantities: IfcElementQuantity.Quantities containing IfcQuantityArea and IfcQuantityVolume
2. Property sets: Qto_* property sets starting with "Qto_"
3. Fallback: null values for missing quantities (marked with ⚠️ indicator)
Supported quantity field names:
- Area: AreaValue, GrossArea, NetArea, GrossSurfaceArea, NetSurfaceArea
- Volume: VolumeValue, GrossVolume, NetVolume
### Weight Calculation
Weight is calculated using:
Weight (kg) = Volume (m³) × 2400 kg/m³ (default density)
Weight is only calculated when volume is available. If volume is missing, weight is displayed as —.
### 3D Visualization
- IFC files are converted to GLB format using IfcOpenShell's serializer
- ExpressID mapping is used to link GLB meshes to IFC elements
- Three.js renders the 3D model with orbit controls
- Highlighting works by replacing materials with a yellow MeshStandardMaterial
- X-ray mode applies transparency (opacity: 0.1) to non-highlighted meshes
### Known Limitations
1. Assumes metric units (m², m³) - no unit conversion performed
2. Requires quantities to be present in IFC file (IfcElementQuantity)
3. No automatic density detection - uses default density of 2400 kg/m³
4. WebGL context loss may occur with complex models - reload page to recover