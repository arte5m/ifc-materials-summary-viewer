import { useState, useCallback } from 'react';
import { Upload } from './components/Upload';
import { Viewer } from './components/Viewer';
import { MaterialsTable } from './components/MaterialsTable';
import { uploadIFC, getMaterialSummary, MaterialGroup } from './services/api';
import './App.css';

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
    setHighlightMode('highlight');

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

  const toggleMaterial = useCallback((materialName: string | null) => {
    setSelectedMaterial(prev => prev === materialName ? null : materialName);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedMaterial(null);
    setHighlightMode('highlight');
  }, []);

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1 className="app-title">IFC Materials Summary Viewer</h1>
      </header>
      
      <main className="app-main">
        <div className="app-content">
          {/* Top Section: Viewer (65%) */}
          <div className="viewer-section">
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
                  onClearSelection={() => toggleMaterial(null)}
                  onReset={handleReset}
                />
              )}
            </div>
          </div>
          
          {/* Bottom Section: Table (35%) */}
          {fileId && materialGroups.length > 0 && (
            <div className="table-section">
              <div className="table-controls">
                <div className="mode-toggle-container">
                  <button
                    className={`mode-button ${highlightMode === 'highlight' ? 'active' : ''}`}
                    onClick={() => setHighlightMode('highlight')}
                  >
                    Highlight
                  </button>
                  <button
                    className={`mode-button ${highlightMode === 'xray' ? 'active-xray' : ''}`}
                    onClick={() => setHighlightMode('xray')}
                  >
                    X-Ray
                  </button>
                </div>
              </div>

              <div className="table-scroll-container">
                <MaterialsTable
                  materialGroups={materialGroups}
                  onMaterialClick={toggleMaterial}
                  selectedMaterial={selectedMaterial}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
