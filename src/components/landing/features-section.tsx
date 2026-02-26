import { CircleSlash, Layout, SendToBack, SlidersVertical } from 'lucide-react';
import { Card } from '../ui/card';

export default function FeatureSection() {
  return (
    <section>
      <div className="py-24 bg-muted/5">
        <div className="mx-auto w-full max-w-5xl px-6 space-y-12">
          <div className="relative z-10 grid items-center gap-4 md:grid-cols-2 md:gap-12">
            <h2 className="text-3xl font-extrabold font-display">
              Everything You Need to Estimate, Nothing You Don&apos;t
            </h2>
            <p className="max-w-sm sm:ml-auto">
              Powerful planning poker features designed to keep your team focused and aligned.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-full overflow-hidden pl-6 pt-6 gap-0">
              <Layout className="text-primary size-5" />
              <h3 className="text-foreground mt-5 text-lg font-semibold">
                Simple, Clean Interface
              </h3>
              <p className="text-muted-foreground mt-3 max-w-2xl text-balance">
                A thoughtfully designed layout that makes collaboration effortless and planning
                fast.
              </p>
              <div className="mask-b-from-80% -ml-2 -mt-2 mr-0.5 pl-2 pt-2">
                <div className="bg-background rounded-tl-(--radius) ring-foreground/5 relative mx-auto mt-8 h-96 overflow-hidden border border-transparent shadow ring-1">
                  <img
                    src="/demo-light.png"
                    alt="app screen"
                    width="2880"
                    height="1842"
                    className="object-top-left h-full object-cover dark:hidden"
                  />

                  <img
                    src="/demo-dark.png"
                    alt="app screen"
                    width="2880"
                    height="1842"
                    className="hidden object-top-left h-full object-cover dark:block"
                  />
                </div>
              </div>
            </Card>
            <Card className="px-6 gap-0">
              <CircleSlash className="text-primary size-5" />
              <h3 className="text-foreground mt-5 text-lg font-semibold">No Account Needed</h3>
              <p className="text-muted-foreground mt-3 text-balance">
                Start estimating instantly - no accounts, no friction, no delays.
              </p>
            </Card>

            <Card className="px-6 gap-0">
              <SendToBack className="text-primary size-5" />
              <h3 className="text-foreground mt-5 text-lg font-semibold">Instant Game Sharing</h3>
              <p className="text-muted-foreground mt-3 text-balance">
                Create a game and share a link in seconds to get your team estimating right away.
              </p>
            </Card>
            <Card className="px-6 gap-0">
              <SlidersVertical className="text-primary size-5" />
              <h3 className="text-foreground mt-5 text-lg font-semibold">Flexible Game Settings</h3>
              <p className="text-muted-foreground mt-3 text-balance">
                Customize your planning poker sessions with options that adapt to your team&apos;s
                workflow.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
