import { useState, useEffect, useCallback, useRef } from "react";
import PianoGrid from "@/components/piano/PianoGrid";
import ControlPanel from "@/components/piano/ControlPanel";
import VolumeModal from "@/components/piano/VolumeModal";
import HelpModal from "@/components/piano/HelpModal";
import SoundSettings, { ADSREnvelope, WaveType } from "@/components/piano/SoundSettings";
import RecordingControls, { Note } from "@/components/piano/RecordingControls";
import SoundPackApplier from "@/components/piano/SoundPackApplier";
import { motion } from "framer-motion";
import { MicIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sound } from "@shared/schema";

export default function PianoSoundboard() {
  const [octave, setOctave] = useState(4);
  const [volume, setVolume] = useState(0.75);
  const [isLoading, setIsLoading] = useState(true);
  const [audioReady, setAudioReady] = useState(false);
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  
  // Sound pack state
  const [soundBank, setSoundBank] = useState<Record<string, Sound>>({});
  const [currentSoundPack, setCurrentSoundPack] = useState<string | null>(null);
  const [soundPackSounds, setSoundPackSounds] = useState<Sound[]>([]);
  const [customSounds, setCustomSounds] = useState(false);
  
  // ADSR envelope and waveform settings
  const [envelope, setEnvelope] = useState<ADSREnvelope>({
    attack: 0.02,
    decay: 0.2,
    sustain: 0.6,
    release: 0.5
  });
  const [waveType, setWaveType] = useState<WaveType>("sine");
  
  // Recording state
  const [recordedSequence, setRecordedSequence] = useState<Note[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Use AudioContext directly instead of through Howler
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Note configuration
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  // Create or resume audio context
  const initAudio = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log("AudioContext created:", audioContextRef.current.state);
      }
      
      if (audioContextRef.current.state !== 'running') {
        audioContextRef.current.resume().then(() => {
          console.log("AudioContext resumed!");
          setAudioReady(true);
        });
      } else {
        setAudioReady(true);
      }
    } catch (e) {
      console.error("Failed to initialize audio context:", e);
    }
  }, []);
  
  // Listen for recording control events
  useEffect(() => {
    const handleStartRecording = (event: any) => {
      const notes = event.detail?.notes || [];
      setRecordedSequence(notes);
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
    };
    
    const handleStopRecording = () => {
      setIsRecording(false);
      recordingStartTimeRef.current = null;
    };
    
    window.addEventListener('piano:start-recording', handleStartRecording);
    window.addEventListener('piano:stop-recording', handleStopRecording);
    
    return () => {
      window.removeEventListener('piano:start-recording', handleStartRecording);
      window.removeEventListener('piano:stop-recording', handleStopRecording);
    };
  }, []);

  // Initialize on load and setup user interaction listeners
  useEffect(() => {
    setIsLoading(true);
    
    // Try to initialize audio context - this may be blocked until user interaction
    initAudio();
    
    // Check for global recording state
    if (typeof window !== 'undefined' && (window as any).__pianoRecordingState) {
      const globalState = (window as any).__pianoRecordingState;
      if (globalState.isRecording) {
        setIsRecording(true);
        recordingStartTimeRef.current = globalState.startTime;
        if (globalState.recordedNotes) {
          setRecordedSequence(globalState.recordedNotes);
        }
      }
    }
    
    // Add event listeners to initialize audio on user interaction (required by many browsers)
    const initOnInteraction = () => {
      initAudio();
      setIsLoading(false);
    };
    
    document.addEventListener('click', initOnInteraction, { once: true });
    document.addEventListener('touchstart', initOnInteraction, { once: true });
    
    // Simulate initial loading for better UX
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => {
      document.removeEventListener('click', initOnInteraction);
      document.removeEventListener('touchstart', initOnInteraction);
      
      // Cleanup audio context when component unmounts
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [initAudio]);

  // Calculate frequency for a given note and octave
  const getNoteFrequency = (note: string, octave: number) => {
    const noteIndex = noteNames.indexOf(note);
    if (noteIndex === -1) return 440; // Default to A4 if note not found
    
    // A4 = 440Hz (note 9, octave 4)
    const a4Index = 9;
    const a4Octave = 4;
    const a4Frequency = 440;
    
    // Calculate semitones from A4
    const semitones = (octave - a4Octave) * 12 + (noteIndex - a4Index);
    
    // Calculate frequency: f = 440 * 2^(n/12) where n is semitones from A4
    return a4Frequency * Math.pow(2, semitones / 12);
  };

  // Play a piano note using Web Audio API directly with ADSR envelope and waveform
  const playNote = (note: string) => {
    if (!audioReady || !audioContextRef.current) {
      console.log("Audio system not ready yet");
      initAudio(); // Try to initialize audio context
      return;
    }
    
    try {
      const ctx = audioContextRef.current;
      
      // Check if we have a custom sound from a sound pack that matches this note
      const customSound = customSounds && soundPackSounds.length > 0 
        ? soundPackSounds.find(sound => sound.note === note && sound.octave === octave)
        : null;
        
      if (customSound && customSound.soundFile) {
        // Play from sound file if available
        console.log(`Playing custom sound for ${note}${octave} from ${currentSoundPack}`);
        
        fetch(customSound.soundFile)
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
          .then(audioBuffer => {
            const source = ctx.createBufferSource();
            const gainNode = ctx.createGain();
            
            source.buffer = audioBuffer;
            
            // Apply volume
            gainNode.gain.value = volume;
            
            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            // Play the sound
            source.start();
            
            // Record the note if recording is active
            recordNoteIfRecording(note);
          })
          .catch(error => {
            console.error('Error loading sound file:', error);
            
            // Fall back to synthesized sound
            playSynthesizedSound(ctx, note);
          });
          
      } else if (customSound) {
        // Use custom sound parameters from the sound pack
        playSynthesizedSound(ctx, note, {
          waveform: customSound.waveform as WaveType || waveType,
          envelope: customSound.envelope as ADSREnvelope || envelope
        });
      } else {
        // Use default synthesized sound
        playSynthesizedSound(ctx, note);
      }
      
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };
  
  // Helper function to play synthesized sound
  const playSynthesizedSound = (
    ctx: AudioContext, 
    note: string, 
    options?: { waveform?: WaveType, envelope?: ADSREnvelope }
  ) => {
    // Create oscillator
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Get options or use defaults
    const useWaveform = options?.waveform || waveType;
    const useEnvelope = options?.envelope || envelope;
    
    // Set frequency based on note and octave
    const frequency = getNoteFrequency(note, octave);
    
    // Set waveform type from settings
    oscillator.type = useWaveform;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    // Calculate total duration based on ADSR
    const totalDuration = useEnvelope.attack + useEnvelope.decay + useEnvelope.release + 0.1;
    
    // Apply ADSR envelope to gain
    const now = ctx.currentTime;
    
    // Initial gain at 0
    gainNode.gain.setValueAtTime(0, now);
    
    // Attack - ramp up to full volume
    gainNode.gain.linearRampToValueAtTime(volume, now + useEnvelope.attack);
    
    // Decay - decrease to sustain level
    gainNode.gain.linearRampToValueAtTime(
      volume * useEnvelope.sustain, 
      now + useEnvelope.attack + useEnvelope.decay
    );
    
    // Release - fade out to silence
    gainNode.gain.linearRampToValueAtTime(
      0.001, 
      now + useEnvelope.attack + useEnvelope.decay + useEnvelope.release
    );
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Play the note
    oscillator.start(now);
    oscillator.stop(now + totalDuration);
    
    // Record the note if recording is active
    recordNoteIfRecording(note);
    
    console.log(`Playing synthesized note: ${note} at octave: ${octave}, frequency: ${frequency}Hz, waveform: ${useWaveform}`);
  };
  
  // Helper function to record a note if recording is active
  const recordNoteIfRecording = (note: string) => {
    if (isRecording && recordingStartTimeRef.current) {
      const noteTime = Date.now() - recordingStartTimeRef.current;
      const recordedNote: Note = {
        note,
        octave,
        time: noteTime
      };
      
      // Add to local state
      setRecordedSequence(prev => [...prev, recordedNote]);
      
      // Send event to recording component
      const event = new CustomEvent('piano:add-note', { 
        detail: { note: recordedNote } 
      });
      window.dispatchEvent(event);
    }
  };
  
  // Start recording a sequence
  const startRecording = () => {
    setRecordedSequence([]);
    setIsRecording(true);
    const startTime = Date.now();
    recordingStartTimeRef.current = startTime;
    
    // Update global state
    if (typeof window !== 'undefined') {
      (window as any).__pianoRecordingState = {
        isRecording: true,
        recordedNotes: [],
        startTime,
        metronomeEnabled: false,
        tempo: 120
      };
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    setIsRecording(false);
    recordingStartTimeRef.current = null;
    
    // Update global state
    if (typeof window !== 'undefined' && (window as any).__pianoRecordingState) {
      (window as any).__pianoRecordingState.isRecording = false;
    }
  };
  
  // Handle modal close without stopping recording
  const handleModalClose = () => {
    // Just close the modal but keep recording if it's active
    setShowRecordingModal(false);
  };
  
  // Handle recording complete
  const handleRecordingComplete = (notes: Note[]) => {
    setRecordedSequence(notes);
    setIsRecording(false);
    console.log("Recording complete with", notes.length, "notes");
    setShowRecordingModal(false);
  };
  
  // Play back a recorded sequence
  const playRecordedSequence = () => {
    if (!audioReady || !audioContextRef.current || recordedSequence.length === 0) {
      return;
    }
    
    // Use setTimeout to schedule each note according to its recorded time
    recordedSequence.forEach(({note, octave: noteOctave, time}) => {
      setTimeout(() => {
        // Temporarily set octave to the recorded octave
        const currentOctave = octave;
        setOctave(noteOctave);
        
        // Play the note
        playNote(note);
        
        // Set the octave back (in the next frame to avoid interference)
        setTimeout(() => setOctave(currentOctave), 0);
      }, time);
    });
  };

  // Handle octave change
  const handleOctaveChange = (newOctave: number) => {
    if (newOctave >= 1 && newOctave <= 7) {
      setOctave(newOctave);
    }
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };
  
  // Apply sound pack to the piano
  const handleApplySoundPack = (sounds: Sound[]) => {
    setSoundPackSounds(sounds);
    setCustomSounds(true);
    
    // Get the sound pack name
    if (sounds.length > 0) {
      // We'll need to look up the pack name separately since our Sound type doesn't have it directly
      const packId = sounds[0]?.packId;
      // For now, just use a generic name - in a real app we'd fetch the pack name
      setCurrentSoundPack('Custom Sound Pack');
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col h-screen">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Piano Soundboard</h1>
          <div className="flex items-center">
            {isLoading ? (
              <>
                <div className="loading-dots">
                  <motion.div
                    animate={{ scale: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 1.4, repeatDelay: 0 }}
                  />
                  <motion.div
                    animate={{ scale: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 1.4, delay: 0.16, repeatDelay: 0 }}
                  />
                  <motion.div
                    animate={{ scale: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 1.4, delay: 0.32, repeatDelay: 0 }}
                  />
                </div>
                <span className="text-sm text-gray-500 ml-2">Loading sounds...</span>
              </>
            ) : (
              <span className="text-sm text-green-500 ml-2">Ready to play</span>
            )}
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-1">Tap the squares to play piano notes</p>
      </header>

      <div className="flex items-center justify-between mb-4">
        <ControlPanel 
          octave={octave}
          onOctaveChange={handleOctaveChange}
          onVolumeClick={() => setShowVolumeModal(true)}
          onHelpClick={() => setShowHelpModal(true)}
          onSettingsClick={() => setShowSettingsModal(true)}
        />

        <SoundPackApplier 
          onApplySoundPack={handleApplySoundPack}
          onSetEnvelope={setEnvelope}
          currentSoundPack={currentSoundPack}
        />
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2">
          {/* Recording status indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 text-red-500 animate-pulse">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs font-medium">Recording</span>
            </div>
          )}
          
          {recordedSequence.length > 0 && !isRecording && (
            <span className="text-xs text-gray-500">{recordedSequence.length} notes recorded</span>
          )}
        </div>
        
        <div className="flex gap-2">
          {recordedSequence.length > 0 && !isRecording && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={playRecordedSequence}
              className="h-8 px-3 py-1 text-xs"
            >
              Play Recording
            </Button>
          )}
          
          <Button
            size="sm"
            variant={isRecording ? "destructive" : "outline"}
            onClick={() => {
              if (isRecording) {
                stopRecording();
              } else {
                setShowRecordingModal(true);
              }
            }}
            className="h-8 px-3 py-1 text-xs"
          >
            {isRecording ? "Stop Recording" : (
              <>
                <MicIcon className="h-3 w-3 mr-1" />
                Record
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-grow overflow-hidden">
        <PianoGrid
          octave={octave}
          onNotePlay={playNote}
          isReady={audioReady}
        />
      </div>

      {showVolumeModal && (
        <VolumeModal
          volume={volume}
          onVolumeChange={handleVolumeChange}
          onClose={() => setShowVolumeModal(false)}
        />
      )}

      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} />
      )}
      
      {showSettingsModal && (
        <SoundSettings
          envelope={envelope}
          waveType={waveType}
          onEnvelopeChange={setEnvelope}
          onWaveTypeChange={setWaveType}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
      
      {showRecordingModal && (
        <RecordingControls
          isOpen={showRecordingModal}
          onClose={handleModalClose}
          audioContext={audioContextRef.current}
          onRecordingComplete={handleRecordingComplete}
        />
      )}
    </div>
  );
}
