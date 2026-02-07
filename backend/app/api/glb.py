"""
GLB export endpoint for IFC files.
Converts IFC to GLB using ifcopenshell's built-in serializer.
Preserves ExpressIDs in a separate JSON mapping file for frontend highlighting.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.util.selector
import json
from pathlib import Path

from app.services.file_storage import get_file_storage

router = APIRouter()


@router.get("/glb/{file_id}")
async def get_glb(file_id: str):
    """
    Convert IFC to GLB (cached) and return file.
    Uses ifcopenshell's built-in GLB serializer - no external tools needed.
    Also creates ExpressID mapping for frontend highlighting.
    """
    storage = get_file_storage()
    ifc_path = storage.get_file_path(file_id)
    glb_path = storage.get_glb_path(file_id)
    json_path = str(glb_path.with_suffix(".json"))

    if not ifc_path:
        raise HTTPException(status_code=404, detail=f"File with ID {file_id} not found")

    try:
        if not glb_path.exists() or not Path(json_path).exists():
            model = ifcopenshell.open(ifc_path)

            settings = ifcopenshell.geom.settings()
            settings.set("apply-default-materials", True)
            settings.set("use-world-coords", True)

            serializer_settings = ifcopenshell.geom.serializer_settings()
            serializer_settings.set("use-element-guids", True)

            serializer = ifcopenshell.geom.serializers.gltf(
                str(glb_path), settings, serializer_settings
            )
            serializer.writeHeader()

            total_count = 0
            mesh_index = 0
            express_id_map = {}
            skipped_ids = set()

            elements = ifcopenshell.util.selector.filter_elements(model, "IfcElement")

            for element in elements:
                try:
                    express_id = element.id()
                    express_id_map[mesh_index] = express_id

                    shape = ifcopenshell.geom.create_shape(settings, element)
                    serializer.write(shape)

                    total_count += 1
                    mesh_index += 1
                except Exception as e:
                    skipped_ids.add(element.id())
                    continue

            serializer.finalize()

            # Save skipped element IDs for alignment with material processing
            storage.save_skipped_ids(file_id, list(skipped_ids))

            with open(json_path, "w") as f:
                json.dump(express_id_map, f)

            storage.save_glb_path(file_id, glb_path)
            storage.save_json_path(file_id, json_path)

        return FileResponse(
            path=str(glb_path),
            filename=f"{file_id}.glb",
            media_type="model/gltf-binary",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/glb/{file_id}/ids")
async def get_glb_element_ids(file_id: str):
    """
    Get ExpressID mapping for GLB file.
    Returns JSON mapping of mesh indices to ExpressIDs.
    """
    storage = get_file_storage()
    glb_path = storage.get_glb_path(file_id)
    json_path = str(glb_path.with_suffix(".json"))

    if not Path(json_path).exists():
        await get_glb(file_id)

    try:
        with open(json_path, "r") as f:
            express_id_map = json.load(f)

        id_to_mesh = {}
        for mesh_idx_str, express_id in express_id_map.items():
            mesh_idx = int(mesh_idx_str)
            if express_id not in id_to_mesh:
                id_to_mesh[express_id] = []
            id_to_mesh[express_id].append(mesh_idx)

        return {"meshToExpressId": express_id_map, "expressIdToMesh": id_to_mesh}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
