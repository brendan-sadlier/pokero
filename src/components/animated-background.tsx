/**
 * @fileoverview Animated background component for Pokero pages.
 * Provides consistent animated decorations across the application.
 */

import { memo } from 'react';
import { motion } from 'framer-motion';

/**
 * Animated background circles for visual appeal.
 * Memoized to prevent unnecessary re-renders.
 *
 * @example
 * <div className="relative">
 *   <AnimatedBackground />
 *   <div className="relative z-10">Content</div>
 * </div>
 */
function AnimatedBackgroundComponent() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large primary circle - top left */}
      <motion.div
        className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/10 dark:bg-primary/20 rounded-full"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Large secondary circle - bottom right */}
      <motion.div
        className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-secondary/10 dark:bg-secondary/20 rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, -90, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Small floating circle - top left area */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-12 h-12 bg-primary/20 dark:bg-primary/30 rounded-full"
        animate={{
          y: [0, -20, 0],
          x: [0, 20, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Small floating circle - bottom right area */}
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-8 h-8 bg-secondary/20 dark:bg-secondary/30 rounded-full"
        animate={{
          y: [0, 30, 0],
          x: [0, -30, 0],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

export const AnimatedBackground = memo(AnimatedBackgroundComponent);
AnimatedBackground.displayName = 'AnimatedBackgroundComponent';

export default AnimatedBackground;
