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
2. Material Type (IfcElement.class) - Fallback
3. "Unassigned" - For elements without material assignments or class

### Quantity Extraction

Quantities are extracted from:

1. Direct quantities: IfcElementQuantity.Quantities containing IfcQuantityArea and IfcQuantityVolume
2. Property sets: Qto_* property sets starting with "Qto_"
3. Fallback: null values for missing quantities (marked with ⚠️ indicator)

### Weight Calculation
Weight is calculated using:
- Weight (kg) = Volume (m³) × 2400 kg/m³ (default density)
- Weight is only calculated when volume is available. If volume is missing, weight is displayed as —

### 3D Visualization
- IFC files are converted to FRAG in frontend, on browser side. @thatopen/fragments is used;
- GlobalID mapping is used to link IFC elements to model geometry.

### Known Limitations
- WebGL context loss may occur with complex models - reload page to recover.

### Assumptions
1. Every material group default density is 2400 kg/m³
2. Assumes metric units (m², m³) - no unit conversion performed