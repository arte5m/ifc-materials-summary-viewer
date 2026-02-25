import { useState, useCallback } from 'react';
import { Upload } from './components/Upload';
import { Viewer } from './components/Viewer';
import { MaterialsTable } from './components/MaterialsTable';
import { uploadIFC, getMaterialSummary, validateIFC, MaterialGroup, ValidationResponse } from './services/api';
import './App.css';

function App() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isViewerLoading, setIsViewerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [materialGroups, setMaterialGroups] = useState<MaterialGroup[]>([]);
  const [highlightMode, setHighlightMode] = useState<'highlight' | 'xray'>('highlight');
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [isValiding, setIsValiding] = useState(false);

  const isAnyLoading = isLoading || isViewerLoading;

  const upload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setSelectedMaterial(null);
    setHighlightMode('highlight');
    setValidationResult(null);

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

  const validate = useCallback(async () => {
    if (!fileId) return;
    
    setIsValiding(true);
    setValidationResult(null);
    
    try {
      const result = await validateIFC(fileId);
      setValidationResult(result);
    } catch (err) {
      setValidationResult({
        valid: false,
        message: err instanceof Error ? err.message : 'Validation failed',
        errorCount: 1,
        warningCount: 0,
        errors: [],
        warnings: [],
      });
    } finally {
      setIsValiding(false);
    }
  }, [fileId]);

  const toggleMaterial = useCallback((materialName: string | null) => {
    setSelectedMaterial(prev => prev === materialName ? null : materialName);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedMaterial(null);
    setHighlightMode('highlight');
  }, []);

  const handleHighlightModeChange = useCallback((mode: 'highlight' | 'xray') => {
    setHighlightMode(mode);
  }, []);

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1 className="app-title">IFC Materials Viewer</h1>
      </header>
      
      <main className="app-main">
        <div className="app-content">
          {/* Top Section: Viewer (65%) */}
          <div className="viewer-section">
            <div className="viewer-with-upload">
              <Upload
                onUpload={upload}
                onValidate={validate}
                isLoading={isAnyLoading}
                isValiding={isValiding}
                error={error}
                validationResult={validationResult}
                hasFile={!!fileId}
              />
              {fileId && (
                <Viewer
                  fileId={fileId}
                  selectedMaterial={selectedMaterial}
                  materialGroups={materialGroups}
                  highlightMode={highlightMode}
                  onHighlightModeChange={handleHighlightModeChange}
                  onClearSelection={() => toggleMaterial(null)}
                  onReset={handleReset}
                  onLoadingChange={setIsViewerLoading}
                  onElementClicked={(materialGroup) => setSelectedMaterial(materialGroup)}
                />
              )}
            </div>
          </div>
          
          {/* Bottom Section: Table (35%) */}
          {fileId && materialGroups.length > 0 && (
            <div className="table-section">
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
