import React from 'react';
import { Twitter, Facebook, Instagram, Linkedin, Youtube, ExternalLink } from 'lucide-react';

export default function Footer() {
  const handleHashLink = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    if (hash === '#privacy' || hash === '#terms') {
      window.location.hash = hash;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }
    const id = hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      window.history.pushState(null, '', hash);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.history.pushState(null, '', '#');
    }
  };

  return (
    <footer className="bg-brand-bg-dark text-white pt-16 sm:pt-20 pb-28 md:pb-10 border-t border-white/10 overflow-hidden" aria-label="Site Footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
          
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-4 mb-6">
              <img 
                src="/logo.png" 
                alt="StudyWeb Logo" 
                width="48" 
                height="56" 
                loading="lazy" 
                decoding="async" 
                className="w-12 h-14 object-contain invert mix-blend-screen" 
              />
              <div className="flex flex-col justify-center mt-1 text-white">
                <span className="font-serif font-semibold text-2xl tracking-[0.15em] leading-none mb-1">
                  STUDY WEB
                </span>
                <span className="font-sans text-[0.6rem] font-medium tracking-[0.18em] opacity-80">
                  FROM CONFUSION TO CLARITY
                </span>
              </div>
            </div>
            <p className="text-white/70 mb-6 max-w-sm text-sm leading-relaxed">
              The AI-powered learning platform that unifies planning, revision, flashcards, practice quizzes, and parent insights into one seamless experience.
            </p>
            
            {/* Social Media Links with Accessible Labels */}
            <div className="flex items-center gap-4 text-white/60">
              <a 
                href="https://x.com/StudyWebai" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="StudyWeb Twitter / X Profile"
                className="hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://www.facebook.com/profile.php?id=61591705465611" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="StudyWeb Facebook Page"
                className="hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="https://www.instagram.com/studywebai/" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="StudyWeb Instagram Profile"
                className="hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="https://www.linkedin.com/in/study-web-a823b9417" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="StudyWeb LinkedIn Company Profile"
                className="hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="https://youtube.com/@studywebai?si=MuOx34RW2jzmRhBL" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="StudyWeb YouTube Channel"
                className="hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-bold text-white mb-4 text-base">Product</h3>
            <ul className="space-y-3 text-sm text-white/70">
              <li>
                <a href="#study-tools" onClick={(e) => handleHashLink(e, '#study-tools')} className="hover:text-white transition-colors">
                  AI Study Tools
                </a>
              </li>
              <li>
                <a href="#for-students" onClick={(e) => handleHashLink(e, '#for-students')} className="hover:text-white transition-colors">
                  For Students
                </a>
              </li>
              <li>
                <a href="#interactive-demo" onClick={(e) => handleHashLink(e, '#interactive-demo')} className="hover:text-white transition-colors">
                  Interactive Demo
                </a>
              </li>
              <li>
                <a href="#pricing" onClick={(e) => handleHashLink(e, '#pricing')} className="hover:text-white transition-colors">
                  Pricing Plans
                </a>
              </li>
              <li>
                <a href="#about" onClick={(e) => handleHashLink(e, '#about')} className="hover:text-white transition-colors">
                  For Parents
                </a>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="font-bold text-white mb-4 text-base">Resources</h3>
            <ul className="space-y-3 text-sm text-white/70">
              <li>
                <a href="#for-students" onClick={(e) => handleHashLink(e, '#for-students')} className="hover:text-white transition-colors">
                  Active Recall Guide
                </a>
              </li>
              <li>
                <a href="#study-tools" onClick={(e) => handleHashLink(e, '#study-tools')} className="hover:text-white transition-colors">
                  Spaced Repetition
                </a>
              </li>
              <li>
                <a href="#faq" onClick={(e) => handleHashLink(e, '#faq')} className="hover:text-white transition-colors">
                  Help & FAQ Center
                </a>
              </li>
              <li>
                <a href="#interactive-demo" onClick={(e) => handleHashLink(e, '#interactive-demo')} className="hover:text-white transition-colors">
                  Practice Quiz Creator
                </a>
              </li>
            </ul>
          </div>

          {/* Company & Legal Links */}
          <div>
            <h3 className="font-bold text-white mb-4 text-base">Company & Legal</h3>
            <ul className="space-y-3 text-sm text-white/70">
              <li>
                <a href="#about" onClick={(e) => handleHashLink(e, '#about')} className="hover:text-white transition-colors">
                  About StudyWeb
                </a>
              </li>
              <li>
                <a href="#contact" onClick={(e) => handleHashLink(e, '#contact')} className="hover:text-white transition-colors">
                  Contact Support
                </a>
              </li>
              <li>
                <a href="#privacy" onClick={(e) => handleHashLink(e, '#privacy')} className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" onClick={(e) => handleHashLink(e, '#terms')} className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
          
        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-xs">
            © {new Date().getFullYear()} StudyWeb Educational Technologies Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
             <span className="text-white/60 text-xs font-medium">All Educational AI Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
