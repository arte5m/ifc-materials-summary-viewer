interface ToolbarProps {
  fileId: string | null;
  highlightMode: 'normal' | 'xray';
  onExport: () => Promise<void>;
  onToggleMode: () => void;
  onReload: () => void;
}

export function Toolbar({ fileId, highlightMode, onExport, onToggleMode, onReload }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button
          className="toolbar-button"
          onClick={onExport}
          disabled={!fileId}
          title="Export materials summary as CSV"
        >
          <span className="button-icon">📥</span>
          <span className="button-text">Export CSV</span>
        </button>
      </div>

      <div className="toolbar-group">
        <button
          className={`toolbar-button ${highlightMode === 'xray' ? 'active' : ''}`}
          onClick={onToggleMode}
          disabled={!fileId}
          title="Toggle X-ray mode"
        >
          <span className="button-icon">{highlightMode === 'xray' ? '🔍' : '👁'}</span>
          <span className="button-text">
            {highlightMode === 'xray' ? 'X-ray' : 'Highlight'}
          </span>
        </button>
      </div>

      <div className="toolbar-group toolbar-group-right">
        <button
          className="toolbar-button toolbar-button-danger"
          onClick={onReload}
          disabled={!fileId}
          title="Reset 3D model to initial state"
        >
          <span className="button-icon">🔄</span>
          <span className="button-text">Reset</span>
        </button>
      </div>
    </div>
  );
}
