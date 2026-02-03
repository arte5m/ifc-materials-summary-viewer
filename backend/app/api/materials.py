from fastapi import APIRouter, HTTPException
from typing import Optional
from app.models.schemas import MaterialsSummaryResponse

router = APIRouter()


@router.get("/materials/{file_id}", response_model=MaterialsSummaryResponse)
async def get_materials_summary(
    file_id: str,
    density: Optional[float] = None
):
    """
    Get materials summary for an uploaded IFC file.
    
    Args:
        file_id: Unique identifier of the uploaded file
        density: Optional default density in kg/m³ for weight calculation
    
    Returns:
        Material groups with aggregated quantities
    """
    # TODO: Load IFC file by file_id
    # TODO: Extract elements and materials
    # TODO: Read quantities from IFC
    # TODO: Group by material and aggregate
    # TODO: Calculate weights if density provided
    
    # Placeholder response
    return {
        "file_id": file_id,
        "material_groups": []
    }