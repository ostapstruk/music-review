import { useState, useRef } from 'react';
import { FiPlay, FiPause } from 'react-icons/fi';

export default function MiniPlay({ previewUrl }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  if (!previewUrl) return null;

  const toggle = (e) => {
    e.preventDefault(); // Щоб не перейти за посиланням картки
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleEnded = () => setPlaying(false);

  return (
    <>
      <audio ref={audioRef} src={previewUrl} onEnded={handleEnded} />
      <button className="mini-play" onClick={toggle}>
        {playing ? <FiPause size={16} /> : <FiPlay size={16} />}
      </button>
    </>
  );
}