import { useSpeech } from '../context/SpeechContext';

export default function Speakable({ text, children, as: Tag = 'span', ...props }) {
  const { speak } = useSpeech();

  return (
    <Tag
      onMouseEnter={() => speak(text)}
      {...props}
    >
      {children}
    </Tag>
  );
}