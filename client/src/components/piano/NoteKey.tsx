import { useState } from "react";
import { motion } from "framer-motion";

interface NoteKeyProps {
  note: string;
  color: string;
  index: number;
  onPlay: (note: string) => void;
  isReady: boolean;
}

export default function NoteKey({ note, color, index, onPlay, isReady }: NoteKeyProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleNotePlay = () => {
    if (!isReady) return;
    
    // Set pressed state for visual feedback
    setIsPressed(true);
    
    // Play the note
    onPlay(note);
    
    // Reset pressed state after animation completes
    setTimeout(() => {
      setIsPressed(false);
    }, 150);
  };

  return (
    <motion.div
      className={`grid-cell note-key ${color} rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer`}
      animate={isPressed ? { 
        scale: 0.92,
        boxShadow: "0 0 15px rgba(59, 130, 246, 0.7)",
        opacity: 1
      } : { 
        scale: 1,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        opacity: 1
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      transition={{ 
        type: "spring",
        stiffness: 500,
        damping: 15,
        duration: 0.1
      }}
      onClick={handleNotePlay}
      onTouchStart={(e) => {
        e.preventDefault(); // Prevent scrolling
        handleNotePlay();
      }}
      // Add more touch events for better mobile response
      onTouchEnd={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
      // Add role and aria for accessibility
      role="button"
      aria-label={`Play ${note} note`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNotePlay();
        }
      }}
    >
      <span className="text-white font-semibold text-lg select-none">{note}</span>
    </motion.div>
  );
}
