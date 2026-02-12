"""
Upload endpoint for IFC files.
Handles file upload and storage only.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, FileResponse

from app.services.file_storage import get_file_storage

router = APIRouter()


@router.post("/upload")
async def upload_ifc(file: UploadFile = File(...)):
    """
    Upload an IFC file and save it.
    Conversion to fragments happens in the browser using IfcLoader.

    Args:
        file: IFC file to upload

    Returns:
        JSON response with fileId, filename, status
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    if not file.filename.lower().endswith(".ifc"):
        raise HTTPException(status_code=400, detail="Only IFC files are supported")

    try:
        content = await file.read()

        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")

        storage = get_file_storage()
        file_id = storage.save_file(content, file.filename)

        return JSONResponse(
            content={
                "fileId": file_id,
                "filename": file.filename,
                "status": "success",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to upload IFC file: {str(e)}"
        )


@router.get("/upload/{file_id}")
async def get_ifc_file(file_id: str):
    """
    Serve the original IFC file for browser-based parsing.
    Conversion to fragments happens client-side using IfcLoader.

    Args:
        file_id: The file ID returned from upload

    Returns:
        The IFC file as a downloadable response
    """
    import os

    storage = get_file_storage()
    file_path = storage.get_file_path(file_id)

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path, filename=f"{file_id}.ifc", media_type="application/octet-stream"
    )
