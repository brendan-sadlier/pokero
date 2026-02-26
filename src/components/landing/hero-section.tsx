import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';
import { IconChevronRight, IconCirclePlus } from '@tabler/icons-react';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export default function HeroSection() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 ">
      <motion.div
        initial="initial"
        animate="animate"
        variants={fadeInUp}
        transition={{ duration: 0.8 }}
        className="text-center max-w-4xl mx-auto"
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold tracking-normal">
          <motion.span
            className="mb-2 pb-2"
            variants={fadeInUp}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Planning Poker,
          </motion.span>
          <br />
          <motion.span
            className="text-primary"
            variants={fadeInUp}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Simplified
          </motion.span>
        </h1>
        <motion.p
          className="mt-6 text-xl text-foreground/80 max-w-2xl mx-auto"
          variants={fadeIn}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          Free, instant estimation. No sign-up. Just share a link and play.
        </motion.p>
        <motion.div
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          variants={fadeIn}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <Button
            size="lg"
            effect="expandIcon"
            icon={IconChevronRight}
            iconPlacement="right"
            asChild
            className="w-full sm:w-auto text-lg z-50"
          >
            <Link to="/create">Start a Session</Link>
          </Button>
          <Button variant="outline" asChild size="lg" className="w-full sm:w-auto text-lg">
            <Link to="/join">Join Game</Link>
          </Button>
        </motion.div>
        <motion.div
          className="mt-4 flex flex-col sm:flex-row gap-4 justify-center"
          variants={fadeIn}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <p className="text-sm text-foreground/70">No account needed. Seriously.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
