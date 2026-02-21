import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownOverlayProps {
  countdownEnd: number;
}

function CountdownOverlayComponent({ countdownEnd }: CountdownOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const remaining = Math.ceil((countdownEnd - Date.now()) / 1000);
    return Math.max(0, Math.min(remaining, 3)); // Cap at 3 seconds
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.ceil((countdownEnd - Date.now()) / 1000);
      const clamped = Math.max(0, Math.min(remaining, 3));
      setSecondsLeft(clamped);

      if (clamped <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [countdownEnd]);

  if (secondsLeft <= 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          key={secondsLeft}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4"
        >
          <span className="text-9xl font-bold text-primary drop-shadow-lg">{secondsLeft}</span>
          <span className="text-xl text-muted-foreground font-medium">Revealing votes...</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export const CountdownOverlay = memo(CountdownOverlayComponent);
CountdownOverlay.displayName = 'CountdownOverlay';

export default CountdownOverlay;
