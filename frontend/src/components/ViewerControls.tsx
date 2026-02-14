import { useCallback } from 'react';

interface ViewerControlsProps {
  highlightMode: 'highlight' | 'xray';
  onHighlightModeChange: (mode: 'highlight' | 'xray') => void;
  onReset: () => void;
  disabled?: boolean;
}

export function ViewerControls({
  highlightMode,
  onHighlightModeChange,
  onReset,
  disabled = false
}: ViewerControlsProps) {
  const handleHighlightClick = useCallback(() => {
    onHighlightModeChange('highlight');
  }, [onHighlightModeChange]);

  const handleXrayClick = useCallback(() => {
    onHighlightModeChange('xray');
  }, [onHighlightModeChange]);

  return (
    <div className="viewer-controls">

      {/* Mode Toggle Group (Now on the right) */}
      <div className="controls-group">
        <button
          className={`control-button mode-button ${highlightMode === 'highlight' ? 'active' : ''}`}
          onClick={handleHighlightClick}
          disabled={disabled}
          title="Highlight mode"
        >
          Highlight
        </button>
        <button
          className={`control-button mode-button ${highlightMode === 'xray' ? 'active-xray' : ''}`}
          onClick={handleXrayClick}
          disabled={disabled}
          title="X-Ray mode"
        >
          X-Ray
        </button>
      </div>

      {/* Divider */}
      <div className="controls-divider" />


      {/* Reset Button (Now on the left) */}
      <button
        className="control-button reset-button"
        onClick={onReset}
        disabled={disabled}
        title="Reset view"
      >
        Reset
      </button>
    </div>
  );
}