import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import AnimatedBackground from '../animated-background';

export default function CallToActionSection() {
  return (
    <section className="bg-background flex-1 overflow-hidden relative flex items-center justify-center border-t border-b border-muted-foreground/5">
      <div className="py-12 container mx-auto relative z-10">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-foreground text-balance text-3xl font-semibold lg:text-4xl">
                Plan Faster with Pokero
              </h2>
            </div>
            <div className="flex justify-end gap-3">
              <Button asChild variant="outline" size="lg">
                <Link to="/join">Join Game</Link>
              </Button>
              <Button asChild size="lg">
                <Link to="/create">Create Game</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <AnimatedBackground />
    </section>
  );
}
