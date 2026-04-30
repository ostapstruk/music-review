import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SpeechContext = createContext(null);

export function SpeechProvider({ children }) {
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem('speech_enabled') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('speech_enabled', enabled);
  }, [enabled]);

  const speak = useCallback((text) => {
    if (!enabled || !text) return;
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'uk-UA';
    utterance.rate = 1.1;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  }, [enabled]);

  const toggle = () => setEnabled(!enabled);

  return (
    <SpeechContext.Provider value={{ enabled, toggle, speak }}>
      {children}
    </SpeechContext.Provider>
  );
}

export function useSpeech() {
  return useContext(SpeechContext);
}