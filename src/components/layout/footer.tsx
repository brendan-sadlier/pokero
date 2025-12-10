import { Link } from 'react-router-dom';
import Logo from '../logo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
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
  );
}
