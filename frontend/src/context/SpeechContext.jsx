import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const SpeechContext = createContext(null);

/**
 * Глобальна озвучка інтерфейсу через Web Speech API.
 *
 * Принципи роботи:
 * 1. Делегування — один listener на document замість обгортки навколо кожної
 *    кнопки. Озвучує елемент за `data-speak` → `aria-label` → `title` →
 *    видимим текстом (для button/a/role=button).
 * 2. Hover з debounce 350 мс — щоб не плювати уривками при швидкому
 *    русі курсором.
 * 3. Focus — без debounce. Підтримує клавіатуру (Tab) та мобільні (тап).
 * 4. Поточну фразу не обриваємо — нові виклики, що приходять під час
 *    говоріння, скіпаємо. Це усуває "рваність" попередньої реалізації.
 * 5. Голос завантажуємо асинхронно (через `voiceschanged`) і шукаємо
 *    український. Якщо нема — fallback на браузерний.
 * 6. Швидкість (rate) — налаштовується юзером, зберігається у localStorage.
 *
 * Експорти:
 * - `speak(text)`  — м'який виклик (скіп якщо вже говоримо)
 * - `speakForce(text)` — обриває попереднє і озвучує (для явних дій типу
 *   кнопки "озвучити рецензію")
 * - `stop()` — обірвати озвучку
 * - `toggle()` — увімкнути/вимкнути загалом
 * - `rate`, `setRate` — швидкість 0.7..1.5
 */
export function SpeechProvider({ children }) {
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem('speech_enabled') === 'true'
  );
  const [rate, setRateState] = useState(() => {
    const stored = parseFloat(localStorage.getItem('speech_rate'));
    return Number.isFinite(stored) ? clampRate(stored) : 1.0;
  });
  const [voice, setVoice] = useState(null);

  const isSpeakingRef = useRef(false);
  const hoverTimerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('speech_enabled', enabled);
    if (!enabled) {
      window.speechSynthesis?.cancel();
      isSpeakingRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    localStorage.setItem('speech_rate', String(rate));
  }, [rate]);

  // Завантаження голосів — асинхронне в усіх браузерах. Перший
  // getVoices() може повернути пустий список; чекаємо `voiceschanged`.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const pickVoice = () => {
      const list = window.speechSynthesis.getVoices();
      if (!list.length) return;
      const uk =
        list.find((v) => v.lang === 'uk-UA') ||
        list.find((v) => v.lang?.toLowerCase().startsWith('uk'));
      setVoice(uk || null);
    };

    pickVoice();
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', pickVoice);
    };
  }, []);

  const speak = useCallback(
    (text) => {
      if (!enabled || !text || typeof window === 'undefined') return;
      if (!window.speechSynthesis) return;
      if (isSpeakingRef.current) return; // не дублюємо

      const utt = new SpeechSynthesisUtterance(String(text).trim());
      utt.lang = 'uk-UA';
      utt.rate = rate;
      utt.volume = 1;
      if (voice) utt.voice = voice;
      utt.onstart = () => { isSpeakingRef.current = true; };
      utt.onend = () => { isSpeakingRef.current = false; };
      utt.onerror = () => { isSpeakingRef.current = false; };
      window.speechSynthesis.speak(utt);
    },
    [enabled, rate, voice]
  );

  const speakForce = useCallback(
    (text) => {
      if (!enabled || !text) return;
      window.speechSynthesis?.cancel();
      isSpeakingRef.current = false;
      // Дамо браузеру коротку паузу після cancel — інакше деякі рушії
      // не запускають наступний speak.
      setTimeout(() => {
        if (!window.speechSynthesis) return;
        const utt = new SpeechSynthesisUtterance(String(text).trim());
        utt.lang = 'uk-UA';
        utt.rate = rate;
        utt.volume = 1;
        if (voice) utt.voice = voice;
        utt.onstart = () => { isSpeakingRef.current = true; };
        utt.onend = () => { isSpeakingRef.current = false; };
        utt.onerror = () => { isSpeakingRef.current = false; };
        window.speechSynthesis.speak(utt);
      }, 60);
    },
    [enabled, rate, voice]
  );

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    isSpeakingRef.current = false;
  }, []);

  const toggle = useCallback(() => setEnabled((prev) => !prev), []);

  const setRate = useCallback((value) => {
    setRateState(clampRate(value));
  }, []);

  // Глобальне делегування подій. Активуємо тільки коли озвучка увімкнена,
  // щоб не тримати слухачів даремно.
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const onFocus = (e) => {
      const text = extractSpeakable(e.target);
      if (text) speak(text);
    };

    const onMouseOver = (e) => {
      const target = e.target;
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        const text = extractSpeakable(target);
        if (text) speak(text);
      }, HOVER_DELAY_MS);
    };

    const onMouseOut = () => {
      clearTimeout(hoverTimerRef.current);
    };

    document.addEventListener('focusin', onFocus);
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);
    return () => {
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      clearTimeout(hoverTimerRef.current);
    };
  }, [enabled, speak]);

  return (
    <SpeechContext.Provider
      value={{ enabled, toggle, speak, speakForce, stop, rate, setRate, voice }}
    >
      {children}
    </SpeechContext.Provider>
  );
}

export function useSpeech() {
  return useContext(SpeechContext);
}

const HOVER_DELAY_MS = 350;
const TEXT_LIMIT = 200;
const SPEAKABLE_SELECTOR =
  'button, a, [role="button"], [role="link"], [data-speak]';

function extractSpeakable(el) {
  if (!el || typeof el.closest !== 'function') return null;
  const target = el.closest(SPEAKABLE_SELECTOR);
  if (!target) return null;
  const explicit = target.getAttribute('data-speak');
  if (explicit) return explicit;
  const aria = target.getAttribute('aria-label');
  if (aria) return aria;
  const title = target.getAttribute('title');
  if (title) return title;
  const text = target.textContent?.replace(/\s+/g, ' ').trim();
  if (text && text.length > 0) {
    return text.length > TEXT_LIMIT ? text.slice(0, TEXT_LIMIT - 1) + '…' : text;
  }
  return null;
}

function clampRate(value) {
  if (!Number.isFinite(value)) return 1.0;
  return Math.min(1.5, Math.max(0.7, value));
}
