import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Play, Pause, Plus, Trash2 } from 'lucide-react';
import { NOTE_NAMES } from '@/lib/piano';
import { type ADSREnvelope } from '@/components/piano/SoundSettings';
import { getNoteFrequency } from '@/lib/piano';

interface Note {
  id: string;
  note: string;
  octave: number;
  startTime: number; // in beats
  duration: number; // in beats
  velocity: number; // 0-1
}

interface PatternSequencerProps {
  audioContext: AudioContext | null;
  gainNode: GainNode | null;
  bpm: number;
  bars: number;
  beatDivision: number;
  soundPack: number | null;
  onSavePattern?: (notes: Note[]) => void;
}

export default function SequencerGrid({
  audioContext,
  gainNode,
  bpm = 120,
  bars = 4,
  beatDivision = 4, // 4 = sixteenth notes
  soundPack,
  onSavePattern
}: PatternSequencerProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const schedulerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const oscillators = useRef<Map<string, OscillatorNode>>(new Map());
  
  // Number of total beats in the pattern
  const totalBeats = bars * 4;
  // Number of grid columns
  const gridColumns = totalBeats * (beatDivision / 4);
  // Beat duration in ms
  const beatDuration = 60000 / bpm;
  
  // Generate grid
  const gridRows = 12; // One octave
  const gridCells = gridColumns * gridRows;
  
  // Get note for a row (from bottom to top)
  const getRowNote = (row: number) => {
    // Start from C4 at the bottom
    const noteIdx = row % NOTE_NAMES.length;
    // Display notes from bottom to top
    return NOTE_NAMES[NOTE_NAMES.length - 1 - noteIdx];
  };
  
  // Get octave for a row
  const getRowOctave = (row: number) => {
    // Higher rows = higher octaves
    // Start with octave 3
    return 3 + Math.floor(row / NOTE_NAMES.length);
  };
  
  // Handle playing the sequencer
  const togglePlay = () => {
    if (isPlaying) {
      stopSequencer();
    } else {
      startSequencer();
    }
  };
  
  // Start the sequencer playback
  const startSequencer = () => {
    if (!audioContext) return;
    
    setIsPlaying(true);
    setCurrentBeat(0);
    
    // Reset time
    lastTimeRef.current = audioContext.currentTime;
    
    // Start animation loop
    requestAnimationFrame(playStep);
    
    // Start scheduler
    schedulerIntervalRef.current = setInterval(() => {
      scheduleNotes();
    }, 100); // Run scheduler every 100ms
  };
  
  // Stop the sequencer playback
  const stopSequencer = () => {
    setIsPlaying(false);
    
    // Stop animation
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    // Stop scheduler
    if (schedulerIntervalRef.current) {
      clearInterval(schedulerIntervalRef.current);
      schedulerIntervalRef.current = null;
    }
    
    // Stop all sounds
    stopAllNotes();
  };
  
  // Animation frame callback for playback
  const playStep = (timestamp: number) => {
    if (!isPlaying || !audioContext) return;
    
    // Calculate beat position
    const elapsed = audioContext.currentTime - lastTimeRef.current;
    const beatPosition = (elapsed / beatDuration) * 1000;
    const currentBeatPosition = beatPosition % totalBeats;
    
    setCurrentBeat(currentBeatPosition);
    
    // Continue animation
    rafRef.current = requestAnimationFrame(playStep);
  };
  
  // Schedule notes ahead of time
  const scheduleNotes = () => {
    if (!audioContext || !gainNode) return;
    
    const lookAheadTime = 0.1; // Look ahead 100ms
    const currentTime = audioContext.currentTime;
    
    // Check all notes
    notes.forEach(note => {
      // Calculate when this note should play
      const noteStartTime = note.startTime * beatDuration / 1000;
      const noteDuration = note.duration * beatDuration / 1000;
      const noteEndTime = noteStartTime + noteDuration;
      
      // If the note is within our scheduling window
      if (
        noteStartTime >= currentTime && 
        noteStartTime < currentTime + lookAheadTime
      ) {
        playNote(note, noteStartTime, noteDuration);
      }
    });
  };
  
  // Play a single note
  const playNote = (note: Note, startTime: number, duration: number) => {
    if (!audioContext || !gainNode) return;
    
    // Create oscillator
    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    
    // Calculate frequency from note and octave
    const frequency = getNoteFrequency(note.note, note.octave);
    osc.frequency.value = frequency;
    
    // Apply envelope
    const envelope: ADSREnvelope = {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.7,
      release: 0.3
    };
    
    // Create gain node for this note
    const noteGain = audioContext.createGain();
    noteGain.gain.value = 0;
    
    // Connect oscillator to note gain node
    osc.connect(noteGain);
    noteGain.connect(gainNode);
    
    // Apply envelope
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(
      note.velocity, 
      startTime + envelope.attack
    );
    noteGain.gain.linearRampToValueAtTime(
      note.velocity * envelope.sustain, 
      startTime + envelope.attack + envelope.decay
    );
    noteGain.gain.setValueAtTime(
      note.velocity * envelope.sustain, 
      startTime + duration - envelope.release
    );
    noteGain.gain.linearRampToValueAtTime(
      0, 
      startTime + duration
    );
    
    // Start and stop the oscillator
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05); // Add a little buffer
    
    // Store the oscillator
    oscillators.current.set(note.id, osc);
    
    // Clean up when done
    osc.onended = () => {
      oscillators.current.delete(note.id);
      osc.disconnect();
      noteGain.disconnect();
    };
  };
  
  // Stop all playing notes
  const stopAllNotes = () => {
    oscillators.current.forEach((osc) => {
      osc.stop();
      osc.disconnect();
    });
    oscillators.current.clear();
  };
  
  // Add a new note at the clicked position
  const addNote = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!gridRef.current) return;
    
    // Get grid dimensions
    const grid = gridRef.current;
    const rect = grid.getBoundingClientRect();
    
    // Calculate click position relative to grid
    const x = event.clientX - rect.left;
    const y = rect.bottom - event.clientY; // Invert Y axis to have higher notes at the top
    
    // Calculate column and row
    const cellWidth = rect.width / gridColumns;
    const cellHeight = rect.height / gridRows;
    
    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);
    
    // Determine note and timing
    const startBeat = col * (4 / beatDivision);
    const note = getRowNote(row);
    const octave = getRowOctave(row);
    
    // Create a new note
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      note,
      octave,
      startTime: startBeat,
      duration: 1, // Default to quarter note
      velocity: 0.7 // Default volume
    };
    
    setNotes(prev => [...prev, newNote]);
    setSelectedNote(newNote.id);
  };
  
  // Update note position and size
  const updateNote = (id: string, x: number, y: number, width: number) => {
    if (!gridRef.current) return;
    
    // Get grid dimensions
    const grid = gridRef.current;
    const rect = grid.getBoundingClientRect();
    
    // Calculate cell sizes
    const cellWidth = rect.width / gridColumns;
    const cellHeight = rect.height / gridRows;
    
    // Calculate grid units from pixel measurements
    const col = Math.floor(x / cellWidth);
    const row = Math.floor((rect.height - y - cellHeight) / cellHeight);
    const durationBeats = Math.max(1, Math.round(width / cellWidth) * (4 / beatDivision));
    
    // Update the note
    setNotes(prevNotes => 
      prevNotes.map(note => {
        if (note.id === id) {
          return {
            ...note,
            note: getRowNote(row),
            octave: getRowOctave(row),
            startTime: col * (4 / beatDivision),
            duration: durationBeats
          };
        }
        return note;
      })
    );
  };
  
  // Delete a note
  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
    if (selectedNote === id) {
      setSelectedNote(null);
    }
  };
  
  // Clear all notes
  const clearPattern = () => {
    if (window.confirm('Are you sure you want to clear the entire pattern?')) {
      setNotes([]);
      setSelectedNote(null);
    }
  };
  
  // Save the pattern
  const savePattern = () => {
    if (onSavePattern) {
      onSavePattern(notes);
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
      }
      stopAllNotes();
    };
  }, []);
  
  return (
    <div className="sequencer-container w-full">
      <div className="sequencer-controls flex justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Button 
            onClick={togglePlay}
            variant="outline"
            size="sm"
            className="w-24"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Play
              </>
            )}
          </Button>
          
          <div className="text-sm">
            BPM: {bpm}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            onClick={clearPattern}
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
      
      <div 
        ref={gridRef}
        className="sequencer-grid relative bg-gray-50 border border-gray-200 rounded-md"
        style={{ 
          height: '400px', 
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gridTemplateRows: `repeat(${gridRows}, 1fr)`,
          backgroundSize: `calc(100% / ${gridColumns}) calc(100% / ${gridRows})`,
          backgroundImage: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)',
          backgroundPosition: '-1px -1px',
        }}
        onClick={addNote}
      >
        {/* Vertical line showing current playback position */}
        {isPlaying && (
          <div 
            className="playhead absolute top-0 bottom-0 w-px bg-blue-500"
            style={{ 
              left: `${(currentBeat / totalBeats) * 100}%`,
              transition: 'left 0.1s linear'
            }}
          />
        )}
        
        {/* Beat markers */}
        {Array.from({ length: bars * 4 + 1 }).map((_, i) => (
          <div
            key={`beat-${i}`}
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: `${(i / totalBeats) * 100}%`,
              backgroundColor: i % 4 === 0 ? '#94a3b8' : '#e2e8f0',
              zIndex: 1
            }}
          />
        ))}
        
        {/* Note blocks */}
        {notes.map((note) => {
          // Calculate pixel positions
          const cellWidth = gridRef.current ? 
            gridRef.current.clientWidth / gridColumns : 0;
          const cellHeight = gridRef.current ? 
            gridRef.current.clientHeight / gridRows : 0;
          
          // Calculate which row this note belongs to
          const noteIdx = NOTE_NAMES.indexOf(note.note);
          const octaveDiff = note.octave - 3; // Relative to our starting octave
          const rowFromBottom = (NOTE_NAMES.length - 1 - noteIdx) + (octaveDiff * NOTE_NAMES.length);
          
          // X position based on start time
          const x = (note.startTime / (4 / beatDivision)) * cellWidth;
          // Y position based on note pitch (from the bottom)
          const y = rowFromBottom * cellHeight;
          // Width based on duration
          const width = note.duration * (cellWidth / (4 / beatDivision));
          
          const isSelected = note.id === selectedNote;
          
          // Mouse handlers for dragging
          const handleDragStart = (e: React.MouseEvent) => {
            e.stopPropagation();
            setSelectedNote(note.id);
            
            // Setup for drag operation
            const el = e.currentTarget as HTMLElement;
            const rect = el.getBoundingClientRect();
            
            // Calculate offset from mouse position to element corner
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;
            
            // Set up mousemove and mouseup handlers for dragging
            const handleMouseMove = (moveEvent: MouseEvent) => {
              const newX = moveEvent.clientX - offsetX;
              const newY = moveEvent.clientY - offsetY;
              
              // Update note position based on grid
              if (gridRef.current) {
                const gridRect = gridRef.current.getBoundingClientRect();
                
                // Calculate grid cell from mouse position
                const col = Math.max(0, Math.floor((newX - gridRect.left) / cellWidth));
                const row = Math.max(0, Math.min(
                  gridRows - 1, 
                  Math.floor((newY - gridRect.top) / cellHeight)
                ));
                
                // Update the note
                setNotes(prevNotes => 
                  prevNotes.map(n => {
                    if (n.id === note.id) {
                      return {
                        ...n,
                        note: getRowNote(gridRows - row - 1), // Invert for bottom-to-top
                        octave: getRowOctave(gridRows - row - 1),
                        startTime: col * (4 / beatDivision)
                      };
                    }
                    return n;
                  })
                );
              }
            };
            
            const handleMouseUp = () => {
              // Remove event listeners
              window.removeEventListener('mousemove', handleMouseMove);
              window.removeEventListener('mouseup', handleMouseUp);
            };
            
            // Add event listeners
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
          };
          
          // Handle resizing the note
          const handleResizeStart = (e: React.MouseEvent) => {
            e.stopPropagation();
            setSelectedNote(note.id);
            
            const startX = e.clientX;
            const startWidth = width;
            
            const handleMouseMove = (moveEvent: MouseEvent) => {
              const delta = moveEvent.clientX - startX;
              const newWidth = Math.max(cellWidth, startWidth + delta);
              
              // Calculate new duration in beats
              const newDuration = Math.max(
                4 / beatDivision, // Minimum one grid cell
                Math.round((newWidth / cellWidth) * (4 / beatDivision))
              );
              
              // Update the note
              setNotes(prevNotes => 
                prevNotes.map(n => {
                  if (n.id === note.id) {
                    return {
                      ...n,
                      duration: newDuration
                    };
                  }
                  return n;
                })
              );
            };
            
            const handleMouseUp = () => {
              // Remove event listeners
              window.removeEventListener('mousemove', handleMouseMove);
              window.removeEventListener('mouseup', handleMouseUp);
            };
            
            // Add event listeners
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
          };
          
          return (
            <div
              key={note.id}
              className={cn(
                "note-block absolute rounded-sm z-10 flex items-center justify-center text-xs font-medium cursor-move",
                isSelected ? "bg-blue-500 text-white" : "bg-blue-200 text-blue-800"
              )}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${cellHeight}px`
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNote(note.id);
              }}
              onMouseDown={handleDragStart}
              onDoubleClick={(e) => {
                e.stopPropagation();
                // Play the note when double-clicked
                if (audioContext && gainNode) {
                  const now = audioContext.currentTime;
                  playNote(note, now, 0.5); // Play for 0.5 seconds
                }
              }}
            >
              <div className="truncate px-1">
                {note.note}{note.octave}
              </div>
              
              {isSelected && (
                <>
                  <button
                    className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                  >
                    &times;
                  </button>
                  
                  {/* Resize handle */}
                  <div 
                    className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleResizeStart(e);
                    }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        Click on the grid to add a note. Click notes to select them.
        Double-click notes to hear them.
      </div>
    </div>
  );
}