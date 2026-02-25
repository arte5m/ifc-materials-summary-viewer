import { useState, useCallback } from 'react';
import { MaterialGroup } from '../types';

interface Props {
  materialGroups: MaterialGroup[];
  onMaterialClick: (materialName: string) => void;
  selectedMaterial?: string | null;
}

export function MaterialsTable({ materialGroups, onMaterialClick, selectedMaterial }: Props) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(() => {
    if (materialGroups.length === 0) {
      return;
    }

    setIsExporting(true);
    try {

    const headers = [
      'MaterialGroup',
      'ElementCount',
      'TotalArea_m2',
      'TotalVolume_m3',
      'Density_kg_m3',
      'TotalWeight_kg',
      'Notes'
    ];

    const rows = materialGroups.map(group => {
      const notes = [];
      if (group.totalArea === null || group.totalArea === undefined) {
        notes.push('missing area');
      }
      if (group.totalVolume === null || group.totalVolume === undefined) {
        notes.push('missing volume');
      }

      return [
        group.materialGroup,
        String(group.elementCount),
        group.totalArea?.toFixed(2) || '-',
        group.totalVolume?.toFixed(2) || '-',
        '2400',
        group.totalWeight?.toFixed(2) || '-',
        notes.length > 0 ? notes.join('; ') : ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'materials_summary.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [materialGroups]);

  return (
    <div className="materials-table-wrapper">
      {materialGroups.length === 0 ? (
        <div className="empty-state">
          <p>No materials found in this IFC file.</p>
          <p className="empty-state-hint">
            This may happen if the file has no material assignments or quantity data.
          </p>
        </div>
      ) : (
        <table className="materials-table-dark">
          <thead>
            <tr>
              <th>Material</th>
              <th className="numeric">Elements</th>
              <th className="numeric">Area (m²)</th>
              <th className="numeric">Volume (m³)</th>
              <th className="numeric" title="Weight is calculated using default density (2400 kg/m³) and requires volume data">Weight (kg)</th>
            </tr>
          </thead>
          <tbody>
            {materialGroups.map((group) => {
              const isSelected = selectedMaterial === group.materialGroup;
              const hasMissingArea = group.totalArea === null || group.totalArea === undefined;
              const hasMissingVolume = group.totalVolume === null || group.totalVolume === undefined;
              const hasMissingData = hasMissingArea || hasMissingVolume;

              return (
                <tr
                  key={group.materialGroup}
                  onClick={() => onMaterialClick(group.materialGroup)}
                  className={isSelected ? 'selected' : ''}
                >
                  <td className="material-cell">
                    {hasMissingData && (
                      <span
                        className="warning-indicator"
                        title={hasMissingArea && hasMissingVolume ? 'missing area and volume' : hasMissingArea ? 'missing area' : 'missing volume'}
                      >
                        ⚠️
                      </span>
                    )}
                    {group.materialGroup}
                  </td>
                  <td className="numeric">{group.elementCount}</td>
                  <td className={`numeric ${hasMissingArea ? 'missing-data' : ''}`}>
                    {group.totalArea?.toFixed(2) || '-'}
                  </td>
                  <td className={`numeric ${hasMissingVolume ? 'missing-data' : ''}`}>
                    {group.totalVolume?.toFixed(2) || '-'}
                  </td>
                  <td className="numeric">{group.totalWeight?.toFixed(2) || '-'}</td>
                </tr>
              );
            })}
          </tbody>
      </table>
      )}

      {materialGroups.length > 0 && (
        <button 
          onClick={handleExport} 
          className="export-csv-button"
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>
      )}
    </div>
  );
}
