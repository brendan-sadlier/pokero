import { Link } from 'react-router-dom';
import Logo from '../logo';

const links = [
  {
    title: 'GitHub',
    href: 'https://github.com/brendan-sadlier/pokero',
  },
  {
    title: 'Request Features',
    href: 'https://github.com/brendan-sadlier/pokero/discussions/categories/ideas',
  },
  {
    title: 'Report Bugs',
    href: 'https://github.com/brendan-sadlier/pokero/issues',
  },
  {
    title: 'Buy Me a Coffee',
    href: 'https://buymeacoffee.com/brendansadlier',
  },
];

export default function Footer() {
  return (
    <footer className="bg-background border-b py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-wrap justify-between gap-12">
          <div className="order-last flex items-center gap-3 md:order-first">
            <Link to="/" aria-label="go home">
              <Logo className="size-6" />
            </Link>
            <span className="text-muted-foreground block text-center text-sm">
              © {new Date().getFullYear()} Brendan Sadlier, All rights reserved
            </span>
          </div>

          <div className="order-first flex flex-wrap gap-x-6 gap-y-4 md:order-last">
            {links.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="text-muted-foreground hover:text-primary block duration-150"
              >
                <span>{link.title}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
