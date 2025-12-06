/**
 * @fileoverview Home page component.
 * Landing page for the Pokero application with navigation to create/join games.
 */

import { Link } from 'react-router-dom';
import Navbar from '../components/navbar';
import { Button } from '../components/ui/button';
import { motion } from 'framer-motion';
import Logo from '../components/logo';
import { AnimatedBackground } from '../components/animated-background';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

/**
 * Landing page with hero section and call-to-action buttons.
 */
export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col">
      <Navbar />

      <div className="bg-background flex-1 overflow-hidden relative flex items-center justify-center min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 ">
          <motion.div
            initial="initial"
            animate="animate"
            variants={fadeInUp}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-normal">
              <motion.span
                className="bg-linear-to-r from-primary to-secondary text-transparent bg-clip-text block mb-2 pb-2"
                variants={fadeInUp}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                Plan Fast, Agree Faster
              </motion.span>
              <motion.span
                className="text-foreground"
                variants={fadeInUp}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                with Pokero
              </motion.span>
            </h1>
            <motion.p
              className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto"
              variants={fadeIn}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              Pokero makes planning poker effortless. Start a session in seconds, invite your team,
              and estimate together without distractions. No logins, no clutter—just fast, fun,
              accurate planning.
            </motion.p>
            <motion.div
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
              variants={fadeIn}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              <Button size="xl" asChild className="w-full sm:w-auto text-lg">
                <Link to="/create">Create Game</Link>
              </Button>
              <Button variant="outline" asChild size="xl" className="w-full sm:w-auto text-lg">
                <Link to="/join">Join Game</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
        <AnimatedBackground />
      </div>

      <footer className="py-6">
        <div className="mx-auto max-w-5xl px-6">
          <Link to="/" aria-label="Go to home" className="mx-auto flex size-fit items-center gap-2">
            <Logo className="size-5" />
            <h1 className="font-ruska mb-0.5">Pokero</h1>
          </Link>

          <nav className="flex flex-wrap justify-center gap-6 text-sm py-3">
            <a
              href="https://github.com/brendan-sadlier/pokero"
              className="text-muted-foreground hover:text-primary block duration-150"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://github.com/brendan-sadlier/pokero/issues"
              className="text-muted-foreground hover:text-primary block duration-150"
              target="_blank"
              rel="noopener noreferrer"
            >
              Report an Issue
            </a>
            <a
              href="https://github.com/brendan-sadlier/pokero/discussions/categories/ideas"
              className="text-muted-foreground hover:text-primary block duration-150"
              target="_blank"
              rel="noopener noreferrer"
            >
              Suggest a Feature
            </a>
          </nav>

          <span className="text-muted-foreground block text-center text-sm">
            © {currentYear} Brendan Sadlier, All rights reserved
          </span>
        </div>
      </footer>
    </div>
  );
}
