import { Link } from 'react-router-dom';
import Navbar from '../components/navbar';
import { Button } from '../components/ui/button';
import { motion } from 'framer-motion';
import Logo from '../components/logo';

export default function Home() {
  return (
    <div className="flex flex-col">
      <Navbar />
      <div className="bg-background flex-1 overflow-hidden relative flex items-center justify-center min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 ">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-normal">
              <motion.span
                className="bg-linear-to-r from-primary to-secondary text-transparent bg-clip-text block mb-2 pb-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                Plan Fast, Agree Faster
              </motion.span>
              <motion.span
                className="text-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                with Pokero
              </motion.span>
            </h1>
            <motion.p
              className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              Pokero makes planning poker effortless. Start a session in seconds, invite your team,
              and estimate together without distractions. No logins, no clutter—just fast, fun,
              accurate planning.
            </motion.p>
            <motion.div
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
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

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/10 dark:bg-primary/20 rounded-full"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'linear',
            }}
          />
          <motion.div
            className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-secondary/10 dark:bg-secondary/20 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, -90, 0],
            }}
            transition={{
              duration: 25,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'linear',
            }}
          />
          <motion.div
            className="absolute top-1/4 left-1/4 w-12 h-12 bg-primary/20 dark:bg-primary/30 rounded-full"
            animate={{
              y: [0, -20, 0],
              x: [0, 20, 0],
            }}
            transition={{
              duration: 5,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-8 h-8 bg-secondary/20 dark:bg-secondary/30 rounded-full"
            animate={{
              y: [0, 30, 0],
              x: [0, -30, 0],
            }}
            transition={{
              duration: 7,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          />
        </div>
      </div>
      <footer className="py-6">
        <div className="mx-auto max-w-5xl px-6">
          <Link to="/" aria-label="go home" className="mx-auto flex size-fit items-center gap-2">
            <Logo className="size-5" />
            <h1 className="font-ruska mb-0.5">Pokero</h1>
          </Link>

          <div className="flex flex-wrap justify-center gap-6 text-sm py-3">
            <a
              href="https://github.com/brendan-sadlier/pokero"
              className="text-muted-foreground hover:text-primary block duration-150"
            >
              <span>GitHub</span>
            </a>
            <a
              href="https://github.com/brendan-sadlier/pokero/issues"
              className="text-muted-foreground hover:text-primary block duration-150"
            >
              <span>Report an Issue</span>
            </a>
            <a
              href="https://github.com/brendan-sadlier/pokero/discussions/categories/ideas"
              className="text-muted-foreground hover:text-primary block duration-150"
            >
              <span>Suggest a Feature</span>
            </a>
          </div>
          <span className="text-muted-foreground block text-center text-sm">
            {' '}
            © {new Date().getFullYear()} Pokero, All rights reserved
          </span>
        </div>
      </footer>
    </div>
  );
}
