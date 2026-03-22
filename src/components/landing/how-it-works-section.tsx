import { IconCards, IconCirclePlus, IconUserPlus } from '@tabler/icons-react';
import AnimatedBackground from '../animated-background';
import { Card } from '../ui/card';
import Balancer from 'react-wrap-balancer';
import type { JSX } from 'react';

type StepText = {
  icon: JSX.Element;
  title: string;
  description: string;
};

const stepText: StepText[] = [
  {
    icon: <IconCirclePlus className="h-6 w-6" />,
    title: 'Create a Room',
    description: "Hit the button, get a link. That's your room.",
  },
  {
    icon: <IconUserPlus className="h-6 w-6" />,
    title: 'Invite Your Team',
    description: 'Share the link. Everyone picks a name and joins.',
  },
  {
    icon: <IconCards className="h-6 w-6" />,
    title: 'Play your Cards',
    description: 'Vote, Reveal, Discuss, Repeat. Easy as that.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-background flex-1 overflow-hidden relative flex items-center justify-center">
      <div className="py-16 container mx-auto relative z-10">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col gap-6">
            <h3 className="text-4xl font-display font-extrabold">
              <Balancer>Three Steps. Zero Friction.</Balancer>
            </h3>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {stepText.map(({ icon, title, description }, index) => (
                <Card key={index} className="p-6">
                  <div className="flex flex-col gap-4">
                    {icon}
                    <h4 className="text-xl font-display font-extrabold text-primary">{title}</h4>
                    <p className="text-base opacity-80">{description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
      <AnimatedBackground />
    </section>
  );
}
