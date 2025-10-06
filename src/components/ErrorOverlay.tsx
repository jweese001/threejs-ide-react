import React from 'react';
import './ErrorOverlay.css';

interface ErrorInfo {
  message: string;
  lineno?: number;
  colno?: number;
  stack?: string;
}

interface ErrorOverlayProps {
  error: ErrorInfo | null;
  onClose: () => void;
}

const ErrorOverlay: React.FC<ErrorOverlayProps> = ({ error, onClose }) => {
  if (!error) {
    return null;
  }

  return (
    <div className="error-overlay">
      <div className="error-content">
        <h3>Runtime Error</h3>
        <pre>{error.message}</pre>
        {error.lineno && (
          <p>
            Line: {error.lineno}, Column: {error.colno}
          </p>
        )}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ErrorOverlay;
