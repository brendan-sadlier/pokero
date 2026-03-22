import {
  IconBolt,
  IconCloudX,
  IconFreeRights,
  IconUserX,
  type TablerIcon,
} from '@tabler/icons-react';
import Balancer from 'react-wrap-balancer';

type ReasonText = {
  icon: TablerIcon;
  title: string;
  description: string;
};

const reasonText: ReasonText[] = [
  {
    icon: IconUserX,
    title: 'No Accounts',
    description: 'Jump right in. No sign-up, no passwords, no hassle.',
  },
  {
    icon: IconCloudX,
    title: 'No Stored Data',
    description: "You sessions vanish when you're done. We don't track, log or remember a thing.",
  },
  {
    icon: IconFreeRights,
    title: '100% Free',
    description:
      'No premium tier, no feature gates, no surprise invoices. The whole thing is yours.',
  },
  {
    icon: IconBolt,
    title: 'Instant Setup',
    description: 'Create a game and share a link in seconds. No waiting, no friction.',
  },
];

export function WhyPokeroSection() {
  return (
    <div className="flex py-16 items-center justify-center">
      <div className="mx-auto w-full max-w-(--breakpoint-xl) px-6 py-12 xl:px-0">
        <h2 className="font-extrabold text-center font-display text-4xl md:text-5xl text-primary">
          <Balancer>Built for teams who hate unnecessary setup.</Balancer>
        </h2>

        <div className="mt-16 grid text-center justify-center gap-x-10 gap-y-16 sm:mt-24 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {reasonText.map(({ icon: Icon, title, description }, index) => (
            <div key={index}>
              <Icon className="mx-auto h-12 w-12 text-primary" />
              <p className="mt-6 font-extrabold font-display text-xl">{title}</p>
              <p className="mt-2 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
