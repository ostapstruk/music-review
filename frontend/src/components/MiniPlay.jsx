import { useState, useRef, useEffect } from 'react';
import { FiPlay, FiPause } from 'react-icons/fi';
import { tracksAPI } from '../api/client';

export default function MiniPlay({ trackId, previewUrl }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(previewUrl);
  const refreshAttempted = useRef(false);

  useEffect(() => {
    setCurrentUrl(previewUrl);
    refreshAttempted.current = false;
  }, [previewUrl]);

  if (!currentUrl) return null;

  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  const handleEnded = () => setPlaying(false);

  const handleError = async () => {
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

  return (
    <>
      <audio
        ref={audioRef}
        src={currentUrl}
        onEnded={handleEnded}
        onError={handleError}
      />
      <button className="mini-play" onClick={toggle}>
        {playing ? <FiPause size={16} /> : <FiPlay size={16} />}
      </button>
    </>
  );
}
