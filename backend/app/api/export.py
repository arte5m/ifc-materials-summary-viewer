"""
Export endpoint for CSV generation.
Exports material summary as a downloadable CSV file.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import csv
import io
from typing import Dict, Any

from app.services.file_storage import get_file_storage
from app.services.ifc_loader import process_ifc_materials

router = APIRouter()


def generate_notes(group: Dict[str, Any]) -> str:
    """
    Generate notes text for missing quantities.

    Args:
        group: Material group dictionary

    Returns:
        Notes string describing missing data
    """
    if not group.get("missingQuantities", False):
        return ""

    missing_parts = []

    # Check if area is missing (None or 0)
    if group.get("totalArea") is None or group.get("totalArea") == 0:
        missing_parts.append("missing area")

    # Check if volume is missing (None or 0)
    if group.get("totalVolume") is None or group.get("totalVolume") == 0:
        missing_parts.append("missing volume")

    if missing_parts:
        return f"Missing quantities: {', '.join(missing_parts)}"

    return ""


@router.get("/export/{file_id}")
async def export_csv(file_id: str):
    """
    Export materials summary as CSV file.

    Args:
        file_id: Unique identifier of the uploaded file

    Returns:
        CSV file download with material groups and quantities
    """
    try:
        # Check if file exists
        storage = get_file_storage()
        file_path = storage.get_file_path(file_id)

        if not file_path:
            raise HTTPException(
                status_code=404, detail=f"File with ID {file_id} not found"
            )

        # Process IFC file and get materials summary
        material_summary = process_ifc_materials(file_path, default_density=2400.0)

        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow(
            [
                "MaterialGroup",
                "ElementCount",
                "TotalArea_m2",
                "TotalVolume_m3",
                "Density_kg_m3",
                "TotalWeight_kg",
                "Notes",
            ]
        )

        # Write data rows
        for group in material_summary:
            material_name = group.get("materialGroup", "Unknown")
            element_count = group.get("elementCount", 0)
            total_area = group.get("totalArea")
            total_volume = group.get("totalVolume")
            density = group.get("density")
            total_weight = group.get("totalWeight")
            notes = generate_notes(group)

            # Format values - use empty string for None values
            area_str = f"{total_area:.2f}" if total_area is not None else ""
            volume_str = f"{total_volume:.2f}" if total_volume is not None else ""
            density_str = f"{density:.0f}" if density is not None else ""
            weight_str = f"{total_weight:.2f}" if total_weight is not None else ""

            writer.writerow(
                [
                    material_name,
                    element_count,
                    area_str,
                    volume_str,
                    density_str,
                    weight_str,
                    notes,
                ]
            )

        # Prepare response
        output.seek(0)

        # Get original filename for CSV naming
        original_filename = storage.get_original_filename(file_id)
        base_name = (
            original_filename.replace(".ifc", "").replace(".IFC", "")
            if original_filename
            else file_id
        )
        csv_filename = f"materials_{base_name}.csv"

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={csv_filename}"},
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export CSV: {str(e)}")
