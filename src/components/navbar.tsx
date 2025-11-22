import { motion } from 'framer-motion';
import { ThemeToggle } from './theme-toggle';
import { Link } from 'react-router-dom';
import PokeroLogo from './logo';

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
            <Link to="/" className="flex items-center gap-2 text-xl font-display">
              <PokeroLogo className="size-6" />
              <span className="bg-linear-to-r from-primary to-secondary inline-block text-transparent bg-clip-text">
                Pokero
              </span>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-4"
          >
            <ThemeToggle />
            <Link
              to="/join"
              className="hidden sm:inline-flex text-md font-medium text-foreground hover:text-secondary hover:scale-105 transition-all duration-200"
            >
              Join Game
            </Link>
            <Link
              to="/create"
              className="hidden sm:inline-flex items-center text-md font-medium text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-lg hover:scale-105 transition-all duration-200"
            >
              Create Game
            </Link>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
