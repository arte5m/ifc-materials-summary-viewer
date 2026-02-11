import { useCallback } from 'react';
import { MaterialGroup } from '../types';

interface Props {
  materialGroups: MaterialGroup[];
  onMaterialClick: (materialName: string) => void;
}

export function MaterialsTable({ materialGroups, onMaterialClick }: Props) {
  const handleExport = useCallback(() => {
    if (materialGroups.length === 0) {
      return;
    }

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
  }, [materialGroups]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid #444', borderRadius: '4px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#2a2a3e', position: 'sticky', top: 0 }}>
              <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #555', color: '#fff' }}>Material</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #555', color: '#fff' }}>Elements</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #555', color: '#fff' }}>Area (m²)</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #555', color: '#fff' }}>Volume (m³)</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #555', color: '#fff' }}>Weight (kg)</th>
            </tr>
          </thead>
          <tbody>
            {materialGroups.map((group, index) => {
              const hasMissingArea = group.totalArea === null || group.totalArea === undefined;
              const hasMissingVolume = group.totalVolume === null || group.totalVolume === undefined;
              const hasMissingData = hasMissingArea || hasMissingVolume;

              return (
                <tr
                  key={group.materialGroup}
                  onClick={() => onMaterialClick(group.materialGroup)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: index % 2 === 0 ? '#1e1e2e' : '#252538',
                    borderBottom: '1px solid #333'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a5e'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#1e1e2e' : '#252538'}
                >
                  <td style={{ padding: '8px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {hasMissingData && (
                      <span style={{ color: '#ff6b6b', fontSize: '14px' }} title={hasMissingArea && hasMissingVolume ? 'missing area and volume' : hasMissingArea ? 'missing area' : 'missing volume'}>
                        ⚠️
                      </span>
                    )}
                    {group.materialGroup}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#ccc' }}>{group.elementCount}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: hasMissingArea ? '#ff6b6b' : '#ccc' }}>{group.totalArea?.toFixed(2) || '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: hasMissingVolume ? '#ff6b6b' : '#ccc' }}>{group.totalVolume?.toFixed(2) || '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#ccc' }}>{group.totalWeight?.toFixed(2) || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleExport}
        style={{
          marginTop: '12px',
          padding: '10px 16px',
          backgroundColor: '#bcf124',
          color: '#1a1a2e',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
          width: '100%'
        }}
      >
        Export CSV
      </button>
    </div>
  );
}
