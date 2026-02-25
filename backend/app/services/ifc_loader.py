from collections import defaultdict
from typing import Optional, TypedDict

import ifcopenshell
import ifcopenshell.util.element
import ifcopenshell.util.selector


class MaterialGroup(TypedDict):
    materialGroup: str
    hasMaterial: int
    elementClass: Optional[str]
    elementCount: int
    totalArea: float
    totalVolume: float
    totalWeight: float
    missingQuantities: bool
    elementIds: list[str]


def get_ifcElements(path: str):
    """Get all IfcElement entities from IFC file"""
    model = ifcopenshell.open(path)
    elements = ifcopenshell.util.selector.filter_elements(model, "IfcElement")
    return elements


def get_ifcElement_quantities(element) -> tuple[Optional[float], Optional[float]]:
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


def get_element_material_Name(element):
    material_name = ifcopenshell.util.selector.get_element_value(
        element, "material.Name"
    )
    return material_name if material_name else None


def get_element_class(element):
    element_class = element.is_a()
    return element_class if element_class else None


def get_element_group_key(element):
    """Returns tuple for hierarchical sorting: (has_material, group_name, class_name)
    - has_material: 0 if has material, 1 if no material (materials sort first)
    - group_name: material name or element class
    - class_name: always element class (for reference)
    """
    material_name = ifcopenshell.util.selector.get_element_value(
        element, "material.Name"
    )

    class_name = element.is_a() or "Unassigned"

    if material_name:
        return (0, material_name, class_name)  # 0 = has material, sort first
    else:
        return (1, class_name, class_name)  # 1 = no material, sort after


def process_ifc_materials(
    file_path: str, default_density: float = 2400.0
) -> list[dict]:
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
    groups: dict[str, MaterialGroup] = defaultdict(  # type: ignore[assignment]
        lambda: {
            "materialGroup": None,
            "hasMaterial": 1,
            "elementClass": None,
            "elementCount": 0,
            "totalArea": 0.0,
            "totalVolume": 0.0,
            "totalWeight": 0.0,
            "missingQuantities": False,
            "elementIds": [],
        }
    )

    for element in elements:
        element_guid = element.GlobalId

        # Get quantities
        area, volume = get_ifcElement_quantities(element)

        # Get grouping key for hierarchical sorting
        has_material, group_name, element_class = get_element_group_key(element)

        # Add element to material group
        groups[group_name]["materialGroup"] = group_name
        groups[group_name]["hasMaterial"] = has_material
        groups[group_name]["elementClass"] = element_class
        groups[group_name]["elementIds"].append(element_guid)
        groups[group_name]["elementCount"] += 1

        # Add quantities
        if area is not None:
            groups[group_name]["totalArea"] += area
        else:
            groups[group_name]["missingQuantities"] = True

        if volume is not None:
            groups[group_name]["totalVolume"] += volume
        else:
            groups[group_name]["missingQuantities"] = True

    # Calculate weights and format output
    result = []
    for _, data in groups.items():
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
                "hasMaterial": data["hasMaterial"],
                "elementClass": data["elementClass"],
                "elementCount": data["elementCount"],
                "totalArea": total_area,
                "totalVolume": total_volume,
                "density": default_density,
                "totalWeight": total_weight,
                "missingQuantities": data["missingQuantities"],
                "elementIds": data["elementIds"],
            }
        )

    # Sort hierarchically: by hasMaterial (0 first), then by materialGroup, then by elementClass
    result.sort(
        key=lambda x: (
            x.get("hasMaterial", 1),
            x.get("materialGroup", ""),
            x.get("elementClass", ""),
        )
    )

    return result
