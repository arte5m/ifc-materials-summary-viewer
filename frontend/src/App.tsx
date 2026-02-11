import { useState, useCallback } from 'react';
import { Upload } from './components/Upload';
import { Viewer } from './components/Viewer';
import { MaterialsTable } from './components/MaterialsTable';
import { Layout, Header, MainContent } from './components/Layout';
import { uploadIFC, getMaterialSummary, MaterialGroup } from './services/api';
import { Manager } from '@thatopen/ui';
import './App.css';

Manager.init();

function App() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materialGroups, setMaterialGroups] = useState<MaterialGroup[]>([]);
  const [highlightMode, setHighlightMode] = useState<'highlight' | 'xray'>('highlight');

  const upload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setSelectedMaterial(null);

    try {
      const response = await uploadIFC(file);
      setFileId(response.fileId);
      const summary = await getMaterialSummary(response.fileId);
      setMaterialGroups(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectMaterial = useCallback((materialName: string | null) => {
    setSelectedMaterial(materialName);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedMaterial(null);
    setHighlightMode('highlight');
  }, []);

  const handleMaterialClick = useCallback((materialName: string) => {
    if (selectedMaterial === materialName) {
      setSelectedMaterial(null);
    } else {
      setSelectedMaterial(materialName);
    }
  }, [selectedMaterial]);

  return (
    <Layout>
      <Header title="IFC Materials Summary Viewer" />
      
      <MainContent
        leftPanel={
          <div className="viewer-with-upload">
            <Upload
              onUpload={upload}
              isLoading={isLoading}
              error={error}
            />
            {fileId && (
              <Viewer
                fileId={fileId}
                selectedMaterial={selectedMaterial}
                materialGroups={materialGroups}
                highlightMode={highlightMode}
                onClearSelection={() => selectMaterial(null)}
                onReset={handleReset}
              />
            )}
          </div>
        }
        rightPanel={
          fileId && materialGroups.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '8px' }}>
              <div style={{
                marginBottom: '8px',
                display: 'flex',
                gap: '8px',
                padding: '8px',
                backgroundColor: '#2a2a3e',
                borderRadius: '4px'
              }}>
                <button
                  onClick={() => setHighlightMode('highlight')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: highlightMode === 'highlight' ? '#bcf124' : '#1a1a2e',
                    color: highlightMode === 'highlight' ? '#1a1a2e' : '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Highlight
                </button>
                <button
                  onClick={() => setHighlightMode('xray')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: highlightMode === 'xray' ? '#bcf124' : '#1a1a2e',
                    color: highlightMode === 'xray' ? '#1a1a2e' : '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  X-Ray
                </button>
              </div>

              <MaterialsTable
                materialGroups={materialGroups}
                onMaterialClick={handleMaterialClick}
              />
            </div>
          ) : null
        }
      />
    </Layout>
  );
}

export default App;
