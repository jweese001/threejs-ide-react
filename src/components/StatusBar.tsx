import React from 'react';

interface StatusBarProps {
  onToggleSnippets: () => void;
  isSnippetDrawerOpen: boolean;
  onExportCode: () => void;
  isExporting: boolean;
  onShowShortcuts: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({ onToggleSnippets, isSnippetDrawerOpen, onExportCode, isExporting, onShowShortcuts }) => {
  return (
    <div className="status-bar">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          className={`status-bar-button ${isSnippetDrawerOpen ? 'open' : ''}`}
          onClick={onToggleSnippets}
          title="Snippets"
        >
          <span className="material-symbols-outlined">code_blocks</span>
        </button>
        <button
          className="status-bar-button"
          onClick={onExportCode}
          disabled={isExporting}
          title={isExporting ? "Exporting..." : "Export Scene Package"}
        >
          {isExporting ? (
            <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>
          ) : (
            <span className="material-symbols-outlined">folder_zip</span>
          )}
        </button>
        <a
          href="https://color.adobe.com/create/color-wheel"
          target="_blank"
          rel="noopener noreferrer"
          className="status-bar-button"
          title="Adobe Color"
        >
          <span className="material-symbols-outlined">palette</span>
        </a>
        <a
          href="https://threejs.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="status-bar-button"
          title="Three.js Documentation"
        >
          <span className="material-symbols-outlined">school</span>
        </a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
        <button
          className="status-bar-button"
          onClick={onShowShortcuts}
          title="Keyboard Shortcuts (Cmd/Ctrl+/)"
        >
          <span className="material-symbols-outlined">help</span>
        </button>
        <div className="shortcut-reminder-text">
          Cmd/Ctrl+Shift+R to reset
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
