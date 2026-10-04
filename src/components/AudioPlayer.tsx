import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Download, Trash2, Edit2, Check, Clock } from 'lucide-react';
import { VoiceNote } from '../types/contact';

interface AudioPlayerProps {
  voiceNote: VoiceNote;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
}

export function formatAudioDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ voiceNote, onDelete, onRename }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(voiceNote.durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(voiceNote.title || 'Mémo vocal');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    setTitleInput(voiceNote.title || 'Mémo vocal');
  }, [voiceNote.title]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn('Erreur lecture audio:', err));
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!duration || duration <= 0) {
        setDuration(audioRef.current.duration || voiceNote.durationSeconds || 0);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && (!duration || duration <= 0)) {
      setDuration(audioRef.current.duration || voiceNote.durationSeconds || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = voiceNote.audioBase64;
    const ext = voiceNote.mimeType.includes('mp4') ? 'm4a' : 'webm';
    a.download = `${(voiceNote.title || 'memo-vocal').replace(/\s+/g, '_')}_${voiceNote.id.slice(0, 6)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveTitle = () => {
    if (onRename && titleInput.trim()) {
      onRename(voiceNote.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  // Format date
  const formattedDate = voiceNote.createdAt
    ? new Date(voiceNote.createdAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-3.5 sm:p-4 transition shadow-xs hover:border-slate-300 dark:hover:border-slate-600">
      <audio
        ref={audioRef}
        src={voiceNote.audioBase64}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Header: Title, Date, Actions */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="text-xs font-semibold px-2 py-1 rounded-lg border border-sky-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 w-full"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                aria-label="Enregistrer le titre"
                className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md transition"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {voiceNote.title || 'Mémo vocal'}
              </span>
              {onRename && (
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  aria-label="Renommer le mémo vocal"
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formattedDate}
            </span>
            {voiceNote.fileSize && (
              <span>• {formatFileSize(voiceNote.fileSize)}</span>
            )}
          </div>
        </div>

        {/* Top actions: Download & Delete */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            aria-label="Télécharger le mémo vocal"
            title="Télécharger l'audio"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {showConfirmDelete ? (
            <div className="flex items-center gap-1 animate-in fade-in">
              <button
                type="button"
                onClick={() => onDelete(voiceNote.id)}
                className="px-2 py-0.5 text-[10px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition"
              >
                Confirmer
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              aria-label="Supprimer le mémo vocal"
              title="Supprimer ce mémo"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Player Controls Bar */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Mettre en pause' : 'Écouter le mémo vocal'}
          className="w-10 h-10 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white flex items-center justify-center shadow-sm shadow-sky-600/30 transition shrink-0"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white ml-0.5" />
          )}
        </button>

        {/* Progress & Waveform Slider */}
        <div className="flex-1 space-y-1">
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              aria-label="Position de lecture"
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            <span>{formatAudioDuration(currentTime)}</span>
            <span>{formatAudioDuration(duration)}</span>
          </div>
        </div>

        {/* Playback speed toggle */}
        <button
          type="button"
          onClick={cyclePlaybackRate}
          aria-label={`Vitesse de lecture: ${playbackRate}x`}
          title="Modifier la vitesse de lecture"
          className="px-2 py-1 text-[10px] font-bold font-mono rounded-lg bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition shrink-0"
        >
          {playbackRate}x
        </button>

        {/* Mute toggle */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
