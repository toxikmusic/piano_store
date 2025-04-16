import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DraggableNoteProps {
  id: string;
  note: string;
  octave: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number) => void;
  onPlay: () => void;
}

export default function DraggableNote({
  id,
  note,
  octave,
  x,
  y,
  width,
  height,
  isSelected,
  onSelect,
  onDelete,
  onDrag,
  onResize,
  onPlay
}: DraggableNoteProps) {
  const noteRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStartX, setResizeStartX] = useState(0);
  const [initialWidth, setInitialWidth] = useState(0);

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    onSelect(id);
    
    // If clicked on the resize handle, start resizing
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) {
      setIsResizing(true);
      setResizeStartX(e.clientX);
      setInitialWidth(width);
      return;
    }
    
    // Otherwise start dragging
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - x,
      y: e.clientY - y
    });
  };

  // Handle mouse move for dragging and resizing
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      onDrag(id, newX, newY);
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStartX;
      const newWidth = Math.max(50, initialWidth + deltaX); // Minimum width of 50px
      onResize(id, newWidth);
    }
  };

  // Handle mouse up to stop dragging or resizing
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // Add global mouse event listeners when dragging or resizing
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing]);

  // Handle double-click to play the note
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay();
  };

  return (
    <div
      ref={noteRef}
      className={cn(
        "note-block absolute rounded-sm z-10 flex items-center cursor-move",
        isSelected ? "bg-blue-500 text-white" : "bg-blue-200 text-blue-800",
        (isDragging || isResizing) && "opacity-70"
      )}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="truncate px-1 text-xs font-medium">
        {note}{octave}
      </div>
      
      {isSelected && (
        <>
          <button
            className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
          >
            &times;
          </button>
          
          <div 
            className="resize-handle absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
            }}
          />
        </>
      )}
    </div>
  );
}