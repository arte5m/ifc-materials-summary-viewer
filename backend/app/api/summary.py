from fastapi import APIRouter, HTTPException

from app.services.file_storage import get_file_storage
from app.services.ifc_loader import process_ifc_materials

router = APIRouter()


@router.get("/summary/{file_id}")
async def get_material_summary(file_id: str):
    """
    Process materials and return summary.
    """
    storage = get_file_storage()
    file_path = storage.get_file_path(file_id)

    if not file_path:
        raise HTTPException(status_code=404, detail=f"File {file_id} not found")

    cached = storage.get_material_summary(file_id)
    if cached:
        return cached

    summary = process_ifc_materials(file_path, default_density=2400)
    storage.save_material_summary(file_id, summary)

    return summary
