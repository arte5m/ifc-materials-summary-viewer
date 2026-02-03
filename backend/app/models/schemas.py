from pydantic import BaseModel
from typing import List, Optional


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    status: str


class MaterialGroup(BaseModel):
    material_name: str
    element_count: int
    total_area: Optional[float]
    total_volume: Optional[float]
    density: Optional[float]
    total_weight: Optional[float]
    element_ids: List[str]
    has_missing_quantities: bool


class MaterialsSummaryResponse(BaseModel):
    file_id: str
    material_groups: List[MaterialGroup]