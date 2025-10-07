import React, { useState, useEffect } from 'react';
import styles from './ConsolePanel.module.css';

export interface ConsoleMessage {
  id: number;
  type: 'log' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  args?: any[];
}

interface ConsolePanelProps {
  messages: ConsoleMessage[];
  onClear: () => void;
  height: number;
  onResize: (newHeight: number) => void;
}

const ConsolePanel: React.FC<ConsolePanelProps> = ({ messages, onClear, height, onResize }) => {
  const [filters, setFilters] = useState({
    log: true,
    warn: true,
    error: true,
  });
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const windowHeight = window.innerHeight;
      const newHeight = windowHeight - e.clientY - 40; // 40px for status bar
      if (newHeight >= 100 && newHeight <= 600) {
        onResize(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  const toggleFilter = (type: 'log' | 'warn' | 'error') => {
    setFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const filteredMessages = messages.filter(msg => filters[msg.type]);

  const getMessageIcon = (type: 'log' | 'warn' | 'error') => {
    switch (type) {
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      default:
        return 'info';
    }
  };

  const formatValue = (value: any): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  return (
    <div className={styles.consolePanel} style={{ height: `${height}px` }}>
      <div
        className={styles.resizeHandle}
        onMouseDown={handleMouseDown}
      >
        <div className={styles.resizeIndicator}></div>
      </div>

      <div className={styles.consoleHeader}>
        <div className={styles.consoleTitle}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '8px' }}>
            terminal
          </span>
          Console
        </div>
        <div className={styles.consoleControls}>
          <button
            className={`${styles.filterButton} ${filters.log ? styles.active : ''}`}
            onClick={() => toggleFilter('log')}
            title="Show logs"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
            Log
          </button>
          <button
            className={`${styles.filterButton} ${filters.warn ? styles.active : ''}`}
            onClick={() => toggleFilter('warn')}
            title="Show warnings"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
            Warn
          </button>
          <button
            className={`${styles.filterButton} ${filters.error ? styles.active : ''}`}
            onClick={() => toggleFilter('error')}
            title="Show errors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
            Error
          </button>
          <div className={styles.divider}></div>
          <button
            className={styles.clearButton}
            onClick={onClear}
            title="Clear console"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
            Clear
          </button>
        </div>
      </div>

      <div className={styles.consoleContent}>
        {filteredMessages.length === 0 ? (
          <div className={styles.emptyState}>Console is empty</div>
        ) : (
          filteredMessages.map((msg) => (
            <div key={msg.id} className={`${styles.consoleMessage} ${styles[msg.type]}`}>
              <span className={`material-symbols-outlined ${styles.messageIcon}`}>
                {getMessageIcon(msg.type)}
              </span>
              <span className={styles.messageText}>
                {msg.args && msg.args.length > 0
                  ? msg.args.map(arg => formatValue(arg)).join(' ')
                  : msg.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConsolePanel;
