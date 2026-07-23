import { BookOpen, Twitter, Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-brand-bg-dark text-white pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
          
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-4 mb-6">
              <img src="/logo.png" alt="Study Web Logo" className="w-12 h-14 object-contain invert mix-blend-screen" />
              <div className="flex flex-col justify-center mt-1 text-white">
                <span className="font-serif font-semibold text-2xl tracking-[0.15em] leading-none mb-1">
                  STUDY WEB
                </span>
                <span className="font-sans text-[0.6rem] font-medium tracking-[0.18em] opacity-80">
                  FROM CONFUSION TO CLARITY
                </span>
              </div>
            </div>
            <p className="text-white/60 mb-6 max-w-sm">
              The AI-powered learning platform that unifies planning, revision, quizzes, and parent insights into one seamless experience.
            </p>
            <div className="flex items-center gap-4 text-white/40">
              <a href="https://x.com/StudyWebai" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="https://www.facebook.com/profile.php?id=61591705465611" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Facebook className="w-5 h-5" /></a>
              <a href="https://www.instagram.com/studywebai/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="https://www.linkedin.com/in/study-web-a823b9417" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></a>
              <a href="https://youtube.com/@studywebai?si=MuOx34RW2jzmRhBL" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Youtube className="w-5 h-5" /></a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-white/60">
              <li><a href="#study-tools" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#for-students" className="hover:text-white transition-colors">For Students</a></li>
              <li><a href="#about" className="hover:text-white transition-colors">For Parents</a></li>
            </ul>
          </div>

          <div className="opacity-35 pointer-events-none select-none transition-opacity duration-300">
            <h4 className="font-bold mb-4 flex items-center gap-1.5 text-white/80">
              Resources
              <span className="text-[9px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded-md font-semibold tracking-wider uppercase">Soon</span>
            </h4>
            <ul className="space-y-3 text-sm text-white/50">
              <li>Blog</li>
              <li>Study Guides</li>
              <li>Help Center</li>
              <li>Community</li>
            </ul>
          </div>

          <div className="opacity-35 pointer-events-none select-none transition-opacity duration-300">
            <h4 className="font-bold mb-4 flex items-center gap-1.5 text-white/80">
              Company
              <span className="text-[9px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded-md font-semibold tracking-wider uppercase">Soon</span>
            </h4>
            <ul className="space-y-3 text-sm text-white/50">
              <li>About Us</li>
              <li>Careers</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Contact</li>
            </ul>
          </div>
          
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} StudyWeb. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
             <span className="text-white/40 text-sm">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
