'use client';
import { useState, useEffect } from 'react';

const CHARS = '!<>-_\\\\/[]{}—=+*^?#________';

export default function ScrambleText({ text, delay = 0 }: { text: string, delay?: number }) {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let frame: number;
    let iteration = 0;
    
    const startScramble = () => {
      const animate = () => {
        setDisplayText(
          text.split('')
            .map((letter, index) => {
              if (index < iteration) return letter;
              return CHARS[Math.floor(Math.random() * CHARS.length)];
            })
            .join('')
        );

        if (iteration >= text.length) {
          cancelAnimationFrame(frame);
          return;
        }

        iteration += 1 / 3; // Velocidad de decodificación
        frame = requestAnimationFrame(animate);
      };
      animate();
    };

    timeout = setTimeout(startScramble, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [text, delay]);

  return <span>{displayText}</span>;
}
