import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Play, Pause, Square, Mic, Save, SkipBack } from "lucide-react";

export interface Note {
  note: string;
  octave: number;
  time: number; // time in milliseconds since recording started
}

interface RecordingControlsProps {
  isOpen: boolean;
  onClose: () => void;
  audioContext: AudioContext | null;
  onRecordingComplete: (notes: Note[]) => void;
}

// External event to sync recording state between components
const recordingEvents = {
  startRecording: (notes?: Note[]) => {
    const event = new CustomEvent('piano:start-recording', { detail: { notes } });
    window.dispatchEvent(event);
  },
  stopRecording: () => {
    const event = new CustomEvent('piano:stop-recording');
    window.dispatchEvent(event);
  },
  addNote: (note: Note) => {
    const event = new CustomEvent('piano:add-note', { detail: { note } });
    window.dispatchEvent(event);
  }
};

export default function RecordingControls({
  isOpen,
  onClose,
  audioContext,
  onRecordingComplete
}: RecordingControlsProps) {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<Note[]>([]);
  const startTimeRef = useRef<number | null>(null);
  
  // Metronome state
  const [tempo, setTempo] = useState(120); // BPM
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const metronomeIntervalRef = useRef<number | null>(null);
  
  // For progress tracking during recording
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef<number | null>(null);
  
  // Create a global window property to track recording across component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__pianoRecordingState = {
        isRecording,
        recordedNotes,
        startTime: startTimeRef.current,
        metronomeEnabled,
        tempo
      };
    }
  }, [isRecording, recordedNotes, metronomeEnabled, tempo]);
  
  // Initialize from global state if available
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__pianoRecordingState) {
      const globalState = (window as any).__pianoRecordingState;
      if (globalState.isRecording) {
        setIsRecording(true);
        setRecordedNotes(globalState.recordedNotes || []);
        startTimeRef.current = globalState.startTime;
        setMetronomeEnabled(globalState.metronomeEnabled || false);
        setTempo(globalState.tempo || 120);
        
        // Restart the timers
        if (startTimeRef.current) {
          // Start recording timer
          recordingTimerRef.current = window.setInterval(() => {
            if (startTimeRef.current) {
              const elapsed = Date.now() - startTimeRef.current;
              setRecordingTime(elapsed);
            }
          }, 100);
          
          // Restart metronome if it was enabled
          if (globalState.metronomeEnabled) {
            startMetronome(globalState.tempo || 120);
          }
        }
      }
    }
  }, []);
  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Don't clear intervals if we're still recording
      if (!isRecording) {
        if (metronomeIntervalRef.current) {
          window.clearInterval(metronomeIntervalRef.current);
        }
        if (recordingTimerRef.current) {
          window.clearInterval(recordingTimerRef.current);
        }
      }
    };
  }, [isRecording]);
  
  // Handle tempo change
  const handleTempoChange = (value: number[]) => {
    const newTempo = value[0];
    setTempo(newTempo);
    
    // Update metronome interval if it's currently playing
    if (isMetronomePlaying && metronomeEnabled) {
      stopMetronome();
      startMetronome(newTempo);
    }
  };
  
  // Play a metronome tick sound
  const playMetronomeTick = (accentBeat = false) => {
    if (!audioContext) return;
    
    const tick = audioContext.createOscillator();
    const tickGain = audioContext.createGain();
    
    // Different sound for the first beat of each measure
    tick.frequency.value = accentBeat ? 1000 : 800;
    tickGain.gain.value = 0.2;
    
    tick.connect(tickGain);
    tickGain.connect(audioContext.destination);
    
    tick.start(audioContext.currentTime);
    tick.stop(audioContext.currentTime + 0.05);
    
    // Visual indicator for metronome beat
    const metronomeIndicator = document.getElementById('metronome-indicator');
    if (metronomeIndicator) {
      metronomeIndicator.classList.add('active');
      setTimeout(() => {
        metronomeIndicator?.classList.remove('active');
      }, 100);
    }
  };
  
  // Start metronome with given tempo
  const startMetronome = (bpm: number) => {
    if (!audioContext) return;
    
    // Calculate interval in milliseconds from BPM
    const beatInterval = 60000 / bpm;
    let beatCount = 0;
    
    // Play initial beat
    playMetronomeTick(true);
    
    // Set interval for subsequent beats
    const intervalId = window.setInterval(() => {
      beatCount = (beatCount + 1) % 4; // Assuming 4/4 time signature
      playMetronomeTick(beatCount === 0); // Accent the first beat of each measure
    }, beatInterval);
    
    metronomeIntervalRef.current = intervalId;
    setIsMetronomePlaying(true);
  };
  
  // Stop metronome
  const stopMetronome = () => {
    if (metronomeIntervalRef.current) {
      window.clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
    setIsMetronomePlaying(false);
  };
  
  // Toggle metronome
  const toggleMetronome = () => {
    if (isMetronomePlaying) {
      stopMetronome();
    } else {
      startMetronome(tempo);
    }
  };
  
  // Event listener for notes from main component
  useEffect(() => {
    const handleNoteAdded = (event: any) => {
      const newNote = event.detail.note;
      if (isRecording && startTimeRef.current && newNote) {
        setRecordedNotes(prev => [...prev, newNote]);
      }
    };
    
    // Listen for note events from main component
    window.addEventListener('piano:add-note', handleNoteAdded);
    
    return () => {
      window.removeEventListener('piano:add-note', handleNoteAdded);
    };
  }, [isRecording]);
  
  // Start recording
  const startRecording = () => {
    setRecordedNotes([]);
    setRecordingTime(0);
    const startTime = Date.now();
    startTimeRef.current = startTime;
    setIsRecording(true);
    
    // Set global recording state
    if (typeof window !== 'undefined') {
      (window as any).__pianoRecordingState = {
        isRecording: true,
        recordedNotes: [],
        startTime,
        metronomeEnabled,
        tempo
      };
    }
    
    // Emit global event for main component
    recordingEvents.startRecording([]);
    
    // Start a timer to update the recording time display
    recordingTimerRef.current = window.setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        setRecordingTime(elapsed);
      }
    }, 100);
    
    // Also start metronome if enabled
    if (metronomeEnabled && !isMetronomePlaying) {
      startMetronome(tempo);
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    setIsRecording(false);
    
    // Update global state
    if (typeof window !== 'undefined' && (window as any).__pianoRecordingState) {
      (window as any).__pianoRecordingState.isRecording = false;
    }
    
    // Emit global event for main component
    recordingEvents.stopRecording();
    
    // Clear recording timer
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    // Stop metronome if it was started for recording
    if (isMetronomePlaying && !metronomeEnabled) {
      stopMetronome();
    }
    
    // Return the recorded notes
    onRecordingComplete(recordedNotes);
  };
  
  // Reset recording
  const resetRecording = () => {
    setRecordedNotes([]);
    setRecordingTime(0);
    startTimeRef.current = null;
    setIsRecording(false);
    
    // Clear recording timer
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };
  
  // Add a note to the recording
  const addNoteToRecording = (note: string, octave: number) => {
    if (isRecording && startTimeRef.current) {
      const time = Date.now() - startTimeRef.current;
      const newNote = { note, octave, time };
      
      setRecordedNotes(prev => {
        const updatedNotes = [...prev, newNote];
        
        // Update global state
        if (typeof window !== 'undefined') {
          (window as any).__pianoRecordingState = {
            ...(window as any).__pianoRecordingState,
            recordedNotes: updatedNotes
          };
        }
        
        return updatedNotes;
      });
    }
  };
  
  // Format time display (mm:ss)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Custom onOpenChange handler to prevent stopping recording on close
  const handleOpenChange = (open: boolean) => {
    if (!open && isRecording) {
      // Don't stop recording, just close the dialog
      onClose();
    } else if (!open) {
      // Not recording, so it's safe to close normally
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recording & Metronome</DialogTitle>
          <DialogDescription>
            Set tempo, enable metronome, and record your performance
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Tempo control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="tempo">Tempo: {tempo} BPM</Label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleMetronome}
                  className="h-8 px-2"
                >
                  {isMetronomePlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div 
                  id="metronome-indicator" 
                  className="w-4 h-4 rounded-full bg-gray-200 transition-colors duration-100"
                />
              </div>
            </div>
            <Slider
              id="tempo"
              min={40}
              max={240}
              step={1}
              value={[tempo]}
              onValueChange={handleTempoChange}
            />
          </div>
          
          {/* Metronome toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="metronome-toggle">Enable metronome during recording</Label>
            <Switch
              id="metronome-toggle"
              checked={metronomeEnabled}
              onCheckedChange={setMetronomeEnabled}
            />
          </div>
          
          {/* Recording controls */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">
                {isRecording ? "Recording: " + formatTime(recordingTime) : "Ready to record"}
              </span>
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
            </div>
            
            <div className="flex justify-between gap-2">
              <Button
                variant={isRecording ? "destructive" : "default"}
                onClick={isRecording ? stopRecording : startRecording}
                className="flex-1"
              >
                {isRecording ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Record
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={resetRecording}
                disabled={isRecording || recordedNotes.length === 0}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                onClick={() => onRecordingComplete(recordedNotes)}
                disabled={isRecording || recordedNotes.length === 0}
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-sm text-gray-500">
              {recordedNotes.length > 0 
                ? `${recordedNotes.length} notes recorded` 
                : 'No notes recorded yet'}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}