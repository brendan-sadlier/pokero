import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import Balancer from 'react-wrap-balancer';
import { IconChevronRight } from '@tabler/icons-react';

export default function CallToActionSection() {
  return (
    <section>
      <div className="bg-background/50 py-12 border-b border-accent">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="max-w-lg text-balance text-2xl font-extrabold font-display text-primary lg:text-3xl">
            <Balancer>Your Next Estimation Session is One Click Away</Balancer>
          </h2>
          <p className="mt-4 text-lg text-foreground/80">
            <Balancer>No sign-up. No credit card. No nonsense.</Balancer>
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild effect="expandIcon" icon={IconChevronRight} iconPlacement="right">
              <Link to="/create">Start a Session</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
