import { useState, useRef, useEffect } from 'react';
import { FiPlay, FiPause, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { tracksAPI } from '../api/client';

export default function AudioPlayer({ trackId, previewUrl, title }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(previewUrl);
  const refreshAttempted = useRef(false);

  // Якщо previewUrl змінився ззовні (нова сторінка треку) — підхопимо.
  useEffect(() => {
    setCurrentUrl(previewUrl);
    refreshAttempted.current = false;
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [previewUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        // play() може реджектнути якщо браузер заблокував або URL помер;
        // onError окремо це підхопить.
      });
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
  };

  const handleError = async () => {
    // CDN-токен у URL-і помер — пробуємо просити бекенд за свіжим.
    if (refreshAttempted.current || !trackId) {
      setPlaying(false);
      return;
    }
    refreshAttempted.current = true;
    try {
      const res = await tracksAPI.refreshPreview(trackId);
      const fresh = res.data?.preview_url;
      if (fresh && fresh !== currentUrl) {
        setCurrentUrl(fresh);
        // Після оновлення src React-ом, перетягуємо плеєр на новий URL і граємо.
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.load();
            audioRef.current.play().catch(() => setPlaying(false));
          }
        }, 0);
      } else {
        setPlaying(false);
      }
    } catch {
      setPlaying(false);
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (val === 0) setMuted(true);
    else setMuted(false);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (muted) {
      audioRef.current.volume = volume || 0.7;
      setMuted(false);
    } else {
      audioRef.current.volume = 0;
      setMuted(true);
    }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentUrl) return null;

  return (
    <div className="audio-player card">
      <audio
        ref={audioRef}
        src={currentUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
      />

      <div className="player-main">
        <button className="player-play-btn" onClick={togglePlay} aria-label={playing ? "Пауза" : "Відтворити"}>
          {playing ? <FiPause size={20} /> : <FiPlay size={20} />}
        </button>

        <div className="player-info">
          <span className="player-label">Прев'ю · {title}</span>
          <div className="player-progress" onClick={handleSeek}>
            <div
              className="player-progress-fill"
              style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="player-times">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-volume">
          <button className="player-mute-btn" onClick={toggleMute}>
            {muted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
        </div>
      </div>
    </div>
  );
}
