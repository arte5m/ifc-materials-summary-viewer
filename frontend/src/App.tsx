// IFC Materials Summary Viewer - Main Application Component
// Manages: file upload, material selection, 3D viewer, and CSV export

import { useState, useCallback, useRef } from 'react';
import { Upload } from './components/Upload';
import { Viewer } from './components/Viewer';
import { MaterialsTable } from './components/MaterialsTable';
import { Toolbar } from './components/Toolbar';
import { Layout, Header, MainContent } from './components/Layout';
import { uploadIFC, exportCSV, getMaterialSummary, MaterialGroup } from './services/api';
import './App.css';

function App() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [highlightMode, setHighlightMode] = useState<'normal' | 'xray'>('normal');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelKey, setModelKey] = useState(0);
  const [materialGroups, setMaterialGroups] = useState<MaterialGroup[]>([]);

  const uploadedFileIdRef = useRef<string | null>(null);

  const upload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setSelectedMaterial(null);
    setHighlightMode('normal');

    try {
      const response = await uploadIFC(file);
      uploadedFileIdRef.current = response.fileId;
      setFileId(response.fileId);
      setModelKey(prev => prev + 1);

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

  const toggleHighlightMode = useCallback(() => {
    setHighlightMode(prev => prev === 'normal' ? 'xray' : 'normal');
  }, []);

  const handleExport = useCallback(async () => {
    if (!fileId) return;
    try {
      await exportCSV(fileId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }, [fileId]);

  const reloadModel = useCallback(() => {
    if (!uploadedFileIdRef.current) return;
    
    setSelectedMaterial(null);
    setHighlightMode('normal');
    setModelKey(prev => prev + 1);
    
    getMaterialSummary(uploadedFileIdRef.current)
      .then((groups) => {
        setMaterialGroups(groups);
      })
      .catch(() => setMaterialGroups([]));
  }, []);

  return (
    <Layout>
      <Header title="IFC Materials Summary Viewer" />
      
      <MainContent
        toolbar={
          fileId ? (
            <Toolbar
              fileId={fileId}
              highlightMode={highlightMode}
              onExport={handleExport}
              onToggleMode={toggleHighlightMode}
              onReload={reloadModel}
            />
          ) : null
        }
        leftPanel={
          <div className="viewer-with-upload">
            <Upload
              onUpload={upload}
              isLoading={isLoading}
              error={error}
            />
            {fileId && (
              <Viewer
                key={modelKey}
                fileId={fileId}
                modelKey={modelKey}
                selectedMaterial={selectedMaterial}
                materialGroups={materialGroups}
                highlightMode={highlightMode}
              />
            )}
          </div>
        }
        rightPanel={
          fileId ? (
            <MaterialsTable
              materialGroups={materialGroups}
              selectedMaterial={selectedMaterial}
              onSelect={selectMaterial}
            />
          ) : null
        }
      />
    </Layout>
  );
}

export default App;
