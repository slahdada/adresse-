import React, { useState } from 'react';
import { Mic, Square, Check, X, RotateCcw, Play, Pause, AlertCircle } from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { VoiceNote } from '../types/contact';
import { formatAudioDuration } from './AudioPlayer';

interface VoiceNoteRecorderProps {
  onSaveVoiceNote: (voiceNote: VoiceNote) => void;
  onCancel?: () => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onSaveVoiceNote,
  onCancel,
}) => {
  const {
    isRecording,
    recordingSeconds,
    audioLevel,
    error,
    recordedAudio,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  } = useVoiceRecorder();

  const [title, setTitle] = useState('');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const handleStart = async () => {
    setTitle(`Mémo vocal du ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
    await startRecording();
  };

  const handleStop = () => {
    stopRecording();
  };

  const handleSave = () => {
    if (!recordedAudio) return;

    const newVoiceNote: VoiceNote = {
      id: `vn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: title.trim() || 'Mémo vocal',
      audioBase64: recordedAudio.audioBase64,
      durationSeconds: recordedAudio.durationSeconds,
      createdAt: new Date().toISOString(),
      mimeType: recordedAudio.mimeType,
      fileSize: recordedAudio.fileSize,
    };

    onSaveVoiceNote(newVoiceNote);
    reset();
    if (onCancel) onCancel();
  };

  const togglePreviewPlay = () => {
    if (!previewAudioRef.current) return;
    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current
        .play()
        .then(() => setIsPreviewPlaying(true))
        .catch((err) => console.warn('Preview error:', err));
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200/80 dark:border-rose-900/60">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      {/* State 1: Ready to record */}
      {!isRecording && !recordedAudio && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Enregistrer un mémo vocal
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Capturez des notes orales, consignes ou comptes-rendus audio.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleStart}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition"
            >
              <Mic className="w-4 h-4" />
              <span>Démarrer</span>
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl transition"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      )}

      {/* State 2: Live Recording */}
      {isRecording && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Enregistrement en cours...
              </span>
            </div>

            <span className="text-base font-mono font-bold tabular-nums text-slate-800 dark:text-slate-100">
              {formatAudioDuration(recordingSeconds)}
            </span>
          </div>

          {/* Audio Visualizer Waves */}
          <div className="flex items-center justify-center gap-1.5 h-12 bg-slate-100/70 dark:bg-slate-800/50 rounded-xl px-4 overflow-hidden">
            {[40, 70, 95, 60, 85, 100, 75, 50, 90, 65, 80, 45, 90, 70, 55].map((height, i) => {
              const dynamicHeight = Math.max(15, height * (0.3 + audioLevel * 0.7));
              return (
                <div
                  key={i}
                  className="w-1.5 bg-rose-500 rounded-full transition-all duration-75"
                  style={{ height: `${dynamicHeight}%` }}
                />
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={cancelRecording}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
              <span>Annuler</span>
            </button>

            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold text-xs rounded-xl shadow-xs transition active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Terminer l'enregistrement</span>
            </button>
          </div>
        </div>
      )}

      {/* State 3: Recording Finished - Preview & Save */}
      {!isRecording && recordedAudio && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <audio
            ref={previewAudioRef}
            src={recordedAudio.audioBase64}
            onEnded={() => setIsPreviewPlaying(false)}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Aperçu du mémo ({formatAudioDuration(recordedAudio.durationSeconds)})
            </span>
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Réenregistrer</span>
            </button>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Titre du mémo (optionnel)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Note client réunion, consignes chantier..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition"
            />
          </div>

          {/* Preview Playbar & Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={togglePreviewPlay}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition"
            >
              {isPreviewPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Écouter</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer le mémo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
