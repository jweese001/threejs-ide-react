import React from 'react';

interface ResizerProps {
  onResize: (newWidthPercentage: number) => void;
  onStow: () => void;
  editorWidth: number;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const Resizer: React.FC<ResizerProps> = ({ onResize, onStow, editorWidth, onDragStart, onDragEnd }) => {
  const handleMouseDown = (mouseDownEvent: React.MouseEvent<HTMLDivElement>) => {
    // Prevent text selection and other default browser actions while dragging
    mouseDownEvent.preventDefault();
    onDragStart(); // Notify parent that drag has started

    const dragStartX = mouseDownEvent.clientX;
    // Calculate the initial width in pixels from the percentage passed in props
    const initialWidthInPixels = (editorWidth / 100) * window.innerWidth;

    const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
      const deltaX = mouseMoveEvent.clientX - dragStartX;
      const newWidthInPixels = initialWidthInPixels + deltaX;

      // Set boundaries to prevent the panes from becoming too small
      const minWidth = 100;
      const maxWidth = window.innerWidth - 100;
      const clampedWidth = Math.max(
        minWidth,
        Math.min(maxWidth, newWidthInPixels)
      );

      const percentage = (clampedWidth / window.innerWidth) * 100;
      onResize(percentage);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      onDragEnd(); // Notify parent that drag has ended
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div id="resizer" onMouseDown={handleMouseDown}>
      <button
        id="stow-button"
        onClick={(e) => {
          // Stop the click from triggering the parent div's onMouseDown
          e.stopPropagation();
          onStow();
        }}
        title="Toggle editor panel"
      >
        ⇄
      </button>
    </div>
  );
};

export default Resizer;
