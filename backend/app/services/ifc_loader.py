import ifcopenshell
import ifcopenshell.util.selector
import ifcopenshell.util.element
from typing import Tuple, Optional, List, Dict, TypedDict
from collections import defaultdict


class MaterialGroup(TypedDict):
    materialGroup: str
    elementCount: int
    totalArea: float
    totalVolume: float
    totalWeight: float
    missingQuantities: bool
    elementIds: List[str]


def get_ifcElements(path: str):
    """Get all IfcElement entities from IFC file"""
    model = ifcopenshell.open(path)
    elements = ifcopenshell.util.selector.filter_elements(model, "IfcElement")
    return elements


def get_ifcElement_quantities(element) -> Tuple[Optional[float], Optional[float]]:
    """Extract area and volume from IFC element"""
    area = None
    volume = None

    # Method 1: Direct IfcElementQuantity access
    if hasattr(element, "IsDefinedBy"):
        for definition in element.IsDefinedBy:
            if definition.is_a("IfcRelDefinesByProperties"):
                prop_def = definition.RelatingPropertyDefinition

                if prop_def.is_a("IfcElementQuantity"):
                    for quantity in prop_def.Quantities:
                        # Get area
                        if quantity.is_a("IfcQuantityArea") and area is None:
                            area = quantity.AreaValue

                        # Get volume
                        if quantity.is_a("IfcQuantityVolume") and volume is None:
                            volume = quantity.VolumeValue

    # Method 2: Fallback to Qto_* property sets
    if area is None or volume is None:
        psets = ifcopenshell.util.element.get_psets(element)

        for pset_name, pset_data in psets.items():
            if pset_name.startswith("Qto_") and isinstance(pset_data, dict):
                if area is None:
                    area = (
                        pset_data.get("NetSurfaceArea")
                        or pset_data.get("GrossSurfaceArea")
                        or pset_data.get("NetArea")
                        or pset_data.get("GrossArea")
                        or pset_data.get("NetSideArea")
                        or pset_data.get("GrossSideArea")
                        or pset_data.get("NetFloorArea")
                        or pset_data.get("GrossFloorArea")
                        or pset_data.get("Area")
                        or pset_data.get("OuterSurfaceArea")
                    )

                if volume is None:
                    volume = pset_data.get("NetVolume") or pset_data.get("GrossVolume")

    return area, volume


def get_materialGroup_name(element) -> str:
    material = ifcopenshell.util.selector.get_element_value(element, "material.Name")
    if material:
        return material
    element_class = element.is_a()
    if element_class:
        return element_class
    return "Unassigned"


def process_ifc_materials(
    file_path: str, default_density: float = 2400.0
) -> List[Dict]:
    """
    Process IFC file and extract material groups with quantities.
    Each element contributes to ONE material group.

    Args:
        file_path: Path to IFC file
        default_density: Default density in kg/m³ for weight calculation (default: 2400)

    Returns:
        List of material group dictionaries
    """
    # Get all elements
    elements = get_ifcElements(file_path)

    # Dictionary to group by material
    groups: Dict[str, MaterialGroup] = defaultdict(
        lambda: {
            "materialGroup": None,
            "elementCount": 0,
            "totalArea": 0.0,
            "totalVolume": 0.0,
            "totalWeight": 0.0,
            "missingQuantities": False,
            "elementIds": [],
        }
    )

    processed_count = 0

    for element in elements:
        element_guid = element.GlobalId

        # Get quantities
        area, volume = get_ifcElement_quantities(element)

        # Get material group for this element
        material_name = get_materialGroup_name(element)

        # Add element to material group
        groups[material_name]["materialGroup"] = material_name
        groups[material_name]["elementIds"].append(element_guid)
        groups[material_name]["elementCount"] += 1

        # Add quantities
        if area is not None:
            groups[material_name]["totalArea"] += area
        else:
            groups[material_name]["missingQuantities"] = True

        if volume is not None:
            groups[material_name]["totalVolume"] += volume
        else:
            groups[material_name]["missingQuantities"] = True

        processed_count += 1

    # Calculate weights and format output
    result = []
    for material_name, data in groups.items():
        # Set to None if no quantities were added (all were 0)
        total_area = data["totalArea"] if data["totalArea"] > 0 else None
        total_volume = data["totalVolume"] if data["totalVolume"] > 0 else None

        # Calculate weight
        total_weight = None
        if total_volume is not None:
            total_weight = total_volume * default_density

        result.append(
            {
                "materialGroup": data["materialGroup"],
                "elementCount": data["elementCount"],
                "totalArea": total_area,
                "totalVolume": total_volume,
                "density": default_density,
                "totalWeight": total_weight,
                "missingQuantities": data["missingQuantities"],
                "elementIds": data["elementIds"],
            }
        )

    # Sort by material name
    result.sort(key=lambda x: x["materialGroup"])

    return result
