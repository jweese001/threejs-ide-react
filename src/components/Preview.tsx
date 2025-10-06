import React from 'react';

interface PreviewProps {
  isDragging: boolean;
}

const Preview = React.forwardRef<HTMLIFrameElement, PreviewProps>(({ isDragging }, ref) => {

  return (
    <iframe
      id="preview-frame"
      ref={ref} // Attach the ref here
      src="/preview.html"
      sandbox="allow-scripts allow-same-origin allow-modals"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        backgroundColor: '#282828',
        pointerEvents: isDragging ? 'none' : 'auto',
      }}
      title="Three.js Preview"
    />
  );
});

export default Preview;
