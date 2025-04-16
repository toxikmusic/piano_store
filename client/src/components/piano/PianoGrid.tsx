import { useMemo } from "react";
import NoteKey from "./NoteKey";

interface PianoGridProps {
  octave: number;
  onNotePlay: (note: string) => void;
  isReady: boolean;
}

export default function PianoGrid({ octave, onNotePlay, isReady }: PianoGridProps) {
  // Note configuration
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  // Colors for the keys
  const colors = [
    'bg-red-400', 'bg-red-500', 
    'bg-orange-400', 'bg-orange-500',
    'bg-amber-400', 'bg-amber-500',
    'bg-yellow-400', 'bg-yellow-500',
    'bg-green-400', 'bg-green-500',
    'bg-emerald-400', 'bg-emerald-500', 
    'bg-teal-400', 'bg-teal-500',
    'bg-cyan-400', 'bg-cyan-500'
  ];

  // Generate piano grid notes - regenerate when octave changes
  const gridNotes = useMemo(() => {
    const notes = [];
    let startNote = 0; // C note
    
    for (let i = 0; i < 16; i++) {
      const noteIndex = (startNote + i) % noteNames.length;
      const colorIndex = i % colors.length;
      notes.push({
        note: noteNames[noteIndex],
        color: colors[colorIndex],
        index: i
      });
    }
    
    return notes;
  }, [octave]); // Re-compute when octave changes

  // Create a handler that includes the note and calls parent with current octave
  const handleNotePlay = (note: string) => {
    // Pass the note to parent where octave is already known and used
    onNotePlay(note); 
  };

  return (
    <div className="grid grid-cols-4 gap-3 h-full">
      {gridNotes.map((noteObj) => (
        <NoteKey
          key={`${noteObj.note}-${octave}-${noteObj.index}`}
          note={noteObj.note}
          color={noteObj.color}
          index={noteObj.index}
          onPlay={handleNotePlay}
          isReady={isReady}
        />
      ))}
    </div>
  );
}
