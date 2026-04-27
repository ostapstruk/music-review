import { useEffect, useState } from 'react';

export default function AnimatedNumber({ value, duration = 800, decimals = 1 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === null || value === undefined) return;
    
    const target = Number(value);
    const start = 0;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out функція для плавного завершення
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      
      setDisplay(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  if (value === null || value === undefined) return '—';
  
  return display.toFixed(decimals);
}