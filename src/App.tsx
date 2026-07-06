/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, useScroll, useSpring } from 'motion/react';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import SocialProof from './components/SocialProof';
import ForStudents from './components/ForStudents';
import StudyTools from './components/StudyTools';
import InteractiveDemo from './components/InteractiveDemo';
import Pricing from './components/Pricing';
import About from './components/About';
import Contact from './components/Contact';
import FAQ from './components/FAQ';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';

export default function App() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen font-sans selection:bg-brand-primary/20 selection:text-brand-primary relative">
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent origin-left z-[100]"
        style={{ scaleX }}
      />
      <Navigation />
      
      <main className="pb-24 md:pb-0">
        <Hero />
        <SocialProof />
        <ForStudents />
        <StudyTools />
        <InteractiveDemo />
        <Pricing />
        <About />
        <Contact />
        <FAQ />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
