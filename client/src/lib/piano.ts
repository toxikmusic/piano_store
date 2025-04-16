// Piano note constants and utility functions

// Note names
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Colors for piano keys
export const NOTE_COLORS = [
  'bg-red-400', 'bg-red-500', 
  'bg-orange-400', 'bg-orange-500',
  'bg-amber-400', 'bg-amber-500',
  'bg-yellow-400', 'bg-yellow-500',
  'bg-green-400', 'bg-green-500',
  'bg-emerald-400', 'bg-emerald-500', 
  'bg-teal-400', 'bg-teal-500',
  'bg-cyan-400', 'bg-cyan-500'
];

// Calculate frequency for a given note and octave
export function getNoteFrequency(note: string, octave: number): number {
  const noteIndex = NOTE_NAMES.indexOf(note);
  if (noteIndex === -1) return 0;
  
  // A4 = 440Hz (note 9, octave 4)
  const a4Index = 9;
  const a4Octave = 4;
  const a4Frequency = 440;
  
  // Calculate semitones from A4
  const semitones = (octave - a4Octave) * 12 + (noteIndex - a4Index);
  
  // Calculate frequency: f = 440 * 2^(n/12) where n is semitones from A4
  return a4Frequency * Math.pow(2, semitones / 12);
}

// Generate piano grid notes
export function generatePianoGridNotes(count: number = 16) {
  const notes = [];
  let startNote = 0; // C note
  
  for (let i = 0; i < count; i++) {
    const noteIndex = (startNote + i) % NOTE_NAMES.length;
    const colorIndex = i % NOTE_COLORS.length;
    notes.push({
      note: NOTE_NAMES[noteIndex],
      color: NOTE_COLORS[colorIndex],
      index: i
    });
  }
  
  return notes;
}
