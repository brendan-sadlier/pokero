/**
 * @fileoverview Home page component.
 * Landing page for the Pokero application with navigation to create/join games.
 */

import { AnimatedBackground } from '../components/animated-background';
import HeroSection from '../components/landing/hero-section';
import Footer from '../components/layout/footer';
import Navbar from '../components/layout/navbar';

/**
 * Landing page with hero section and call-to-action buttons.
 */
export default function Home() {
  return (
    <div className="flex flex-col">
      <Navbar />
      <div className="bg-background flex-1 overflow-hidden relative flex items-center justify-center min-h-screen">
        <HeroSection />
        <AnimatedBackground />
      </div>
      <Footer />
    </div>
  );
}
