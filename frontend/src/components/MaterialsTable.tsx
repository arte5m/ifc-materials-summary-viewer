import { useMemo } from 'react';
import { MaterialGroup } from '../types';

interface MaterialsTableProps {
  materialGroups: MaterialGroup[];
  selectedMaterial: string | null;
  onSelect: (materialName: string | null) => void;
}

function formatNumber(value: number | null, decimals: number = 2): string {
  if (value === null) return '-';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function MaterialsTable({ materialGroups, selectedMaterial, onSelect }: MaterialsTableProps) {
  const sortedGroups = useMemo(() => {
    return [...materialGroups].sort((a, b) => 
      a.materialGroup.localeCompare(b.materialGroup)
    );
  }, [materialGroups]);

  if (!materialGroups || materialGroups.length === 0) {
    return (
      <div className="materials-table-container">
        <div className="table-placeholder">
          <span className="placeholder-icon">📋</span>
          <p>No file loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="materials-table-container">
      <table className="materials-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>Elements</th>
            <th>Area (m²)</th>
            <th>Volume (m³)</th>
            <th>Weight (kg)</th>
          </tr>
        </thead>
        <tbody>
          {sortedGroups.map(group => (
            <tr
              key={group.materialGroup}
              className={`${selectedMaterial === group.materialGroup ? 'selected' : ''} ${group.missingQuantities ? 'has-warning' : ''}`}
              onClick={() => onSelect(
                selectedMaterial === group.materialGroup ? null : group.materialGroup
              )}
            >
              <td className="material-name">
                {group.materialGroup}
                {group.missingQuantities && (
                  <span className="warning-badge" title="Missing quantities">
                    ⚠️
                  </span>
                )}
              </td>
              <td>{group.elementCount}</td>
              <td>{formatNumber(group.totalArea)}</td>
              <td>{formatNumber(group.totalVolume)}</td>
              <td>{formatNumber(group.totalWeight)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
