from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.schemas import UploadResponse

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_ifc(file: UploadFile = File(...)):
    """
    Upload an IFC file for processing.
    
    Returns:
        file_id: Unique identifier for the uploaded file
        filename: Original filename
        status: Upload status
    """
    # TODO: Implement file validation
    # TODO: Save file with unique ID
    # TODO: Return file_id for subsequent requests
    
    if not file.filename.endswith('.ifc'):
        raise HTTPException(status_code=400, detail="File must be an IFC file")
    
    # Placeholder response
    return {
        "file_id": "placeholder-id",
        "filename": file.filename,
        "status": "uploaded"
    }