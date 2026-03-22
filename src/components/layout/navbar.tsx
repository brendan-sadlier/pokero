import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../theme-toggle';
import PokeroLogo from '../logo';
import { Button } from '../ui/button';
import { IconChevronRight } from '@tabler/icons-react';

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <Link to="/" className="flex items-center gap-2.5 text-xl font-ruska">
              <PokeroLogo className="h-6 w-6 text-primary" />
              <span className="font-display font-extrabold">Pokero</span>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-4"
          >
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link to="/join" className="">
                Join Game
              </Link>
            </Button>
            <Button asChild effect="expandIcon" icon={IconChevronRight} iconPlacement="right">
              <Link to="/create">Create Game</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
