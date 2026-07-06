import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  GraduationCap, 
  Sparkles, 
  CreditCard, 
  LogIn, 
  Menu, 
  X,
  User,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Track the current scrolled section to dynamically highlight active state
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
      
      if (window.scrollY < 120) {
        setActiveSection('home');
        return;
      }

      const sections = [
        { id: 'for-students', key: 'for-students' },
        { id: 'study-tools', key: 'study-tools' },
        { id: 'pricing', key: 'pricing' },
        { id: 'contact', key: 'contact' }
      ];

      let currentActive = 'home';
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Highlight when the section header crosses the middle-upper part of viewport
          if (rect.top <= window.innerHeight * 0.45) {
            currentActive = section.key;
          }
        }
      }
      setActiveSection(currentActive);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#', key: 'home' },
    { name: 'For Students', href: '#for-students', key: 'for-students' },
    { name: 'Features', href: '#study-tools', key: 'study-tools' },
    { name: 'Pricing', href: '#pricing', key: 'pricing' },
    { name: 'Contact', href: '#contact', key: 'contact' },
  ];

  const bottomNavLinks = [
    { name: 'Home', href: '#', icon: <Home className="w-5 h-5" />, key: 'home' },
    { name: 'Students', href: '#for-students', icon: <GraduationCap className="w-5 h-5" />, key: 'for-students' },
    { name: 'Features', href: '#study-tools', icon: <Sparkles className="w-5 h-5" />, key: 'study-tools' },
    { name: 'Pricing', href: '#pricing', icon: <CreditCard className="w-5 h-5" />, key: 'pricing' },
    { 
      name: 'Login', 
      onClick: () => { 
        setIsAuthModalOpen(true); 
        setAuthMode('login'); 
      }, 
      icon: <LogIn className="w-5 h-5" />, 
      key: 'login' 
    },
  ];

  return (
    <>
      {/* Sticky Top Header Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-card-bg/80 dark:bg-brand-bg-dark/80 backdrop-blur-md shadow-sm py-4 border-b border-card-border/50'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="#" className="flex items-center gap-2">
                <img src="/logo.png" alt="Study Web Logo" className="h-16 w-auto object-contain dark:invert transition-all" />
              </a>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <div className="flex gap-6">
                {navLinks.map((link) => {
                  const isActive = activeSection === link.key;
                  return (
                    <a
                      key={link.name}
                      href={link.href}
                      className={`text-sm font-semibold transition-colors duration-200 relative py-1 ${
                        isActive 
                          ? 'text-brand-primary font-bold' 
                          : 'text-brand-text-light hover:text-brand-primary'
                      }`}
                    >
                      {link.name}
                      {isActive && (
                        <motion.div 
                          layoutId="desktopActiveUnderline" 
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full" 
                        />
                      )}
                    </a>
                  );
                })}
              </div>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <button 
                  onClick={() => { setIsAuthModalOpen(true); setAuthMode('login'); }}
                  className="text-sm font-semibold text-brand-text hover:text-brand-primary transition-colors cursor-pointer"
                >
                  Login
                </button>
                <button 
                  onClick={() => { setIsAuthModalOpen(true); setAuthMode('signup'); }}
                  className="bg-brand-primary hover:bg-brand-secondary text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-md shadow-brand-primary/20 hover:shadow-lg hover:shadow-brand-secondary/30 transform hover:-translate-y-0.5 cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Mobile Actions Header (Theme toggle & simplified Quick CTA) */}
            <div className="md:hidden flex items-center gap-3">
              <ThemeToggle />
              <button 
                onClick={() => { setIsAuthModalOpen(true); setAuthMode('signup'); }}
                className="bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/20 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              >
                Go Pro
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Floating Sticky Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-5 left-4 right-4 z-50">
        <div className="bg-card-bg/85 dark:bg-brand-bg-dark/85 backdrop-blur-xl border border-card-border/70 rounded-2xl py-2.5 px-3.5 shadow-[0_-8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.4)] flex items-center justify-around relative">
          {bottomNavLinks.map((link) => {
            const isActive = link.key === 'login' ? isAuthModalOpen : activeSection === link.key;
            
            const content = (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeMobileTabIndicator"
                    className="absolute inset-0 bg-brand-primary/10 dark:bg-brand-primary/20 rounded-xl"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className={`transition-all duration-300 relative z-10 ${
                  isActive 
                    ? 'text-brand-primary scale-110 font-bold' 
                    : 'text-brand-text-light group-hover:text-brand-text'
                }`}>
                  {link.icon}
                </div>
                <span className={`text-[9px] font-extrabold tracking-tight relative z-10 transition-colors duration-300 ${
                  isActive 
                    ? 'text-brand-primary' 
                    : 'text-brand-text-light group-hover:text-brand-text'
                }`}>
                  {link.name}
                </span>
              </>
            );

            if (link.onClick) {
              return (
                <button
                  key={link.name}
                  onClick={link.onClick}
                  className="flex flex-col items-center gap-1.5 py-1 px-3 relative cursor-pointer group focus:outline-none"
                >
                  {content}
                </button>
              );
            }

            return (
              <a
                key={link.name}
                href={link.href}
                className="flex flex-col items-center gap-1.5 py-1 px-3 relative cursor-pointer group"
              >
                {content}
              </a>
            );
          })}
        </div>
      </div>

      {/* Auth Modal Overlay */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card-bg dark:bg-brand-bg-dark border border-card-border rounded-3xl p-8 shadow-2xl overflow-hidden z-10 transition-colors duration-300"
            >
              {/* Top decoration glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-primary/20 rounded-full blur-[60px] pointer-events-none" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-secondary/20 rounded-full blur-[60px] pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full border border-card-border hover:bg-card-border/30 text-brand-text-light hover:text-brand-text transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="text-center space-y-2 mb-6">
                <img src="/logo.png" alt="StudyWeb Logo" className="h-12 mx-auto dark:invert mb-1" />
                <h3 className="text-2xl font-extrabold font-display text-brand-text">
                  {authMode === 'login' ? 'Welcome Back!' : 'Create Your Account'}
                </h3>
                <p className="text-xs text-brand-text-light font-medium">
                  {authMode === 'login' 
                    ? 'Log in to continue your automated, smart study sessions' 
                    : 'Join thousands of students and study smarter with AI'}
                </p>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-card-border/30 p-1.5 rounded-xl mb-6">
                <button
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-brand-primary text-white shadow-md'
                      : 'text-brand-text-light hover:text-brand-text'
                  }`}
                >
                  Log In
                </button>
                <button
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-brand-primary text-white shadow-md'
                      : 'text-brand-text-light hover:text-brand-text'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Form (Simulated submission) */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  alert(authMode === 'login' ? 'Successfully logged in to StudyWeb!' : 'Welcome! Your StudyWeb account has been created.');
                  setIsAuthModalOpen(false);
                }} 
                className="space-y-4"
              >
                {authMode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-brand-text">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light" />
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-card-border bg-card-bg/50 dark:bg-brand-bg-dark/50 backdrop-blur-sm text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-text">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-card-border bg-card-bg/50 dark:bg-brand-bg-dark/50 backdrop-blur-sm text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-brand-text">Password</label>
                    {authMode === 'login' && (
                      <a href="#contact" onClick={() => setIsAuthModalOpen(false)} className="text-[10px] text-brand-primary hover:underline font-bold">
                        Forgot Password?
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-card-border bg-card-bg/50 dark:bg-brand-bg-dark/50 backdrop-blur-sm text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-text-light hover:text-brand-text focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authMode === 'signup' && (
                  <div className="flex items-center gap-2 pt-1">
                    <input type="checkbox" required id="agree-terms" className="rounded border-card-border text-brand-primary focus:ring-brand-primary/20 w-4 h-4" />
                    <label htmlFor="agree-terms" className="text-[10px] text-brand-text-light font-semibold">
                      I agree to the <span className="text-brand-primary">Terms of Service</span> and <span className="text-brand-primary">Privacy Policy</span>.
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-brand-primary hover:bg-brand-secondary text-white py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg shadow-brand-primary/10 hover:shadow-xl hover:shadow-brand-secondary/25 flex items-center justify-center gap-2 group cursor-pointer mt-2"
                >
                  {authMode === 'login' ? 'Log In' : 'Create Free Account'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              {/* Footer */}
              <div className="mt-6 pt-6 border-t border-card-border/60 text-center">
                <span className="text-xs text-brand-text-light">
                  {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                </span>
                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="text-xs font-extrabold text-brand-primary hover:underline cursor-pointer"
                >
                  {authMode === 'login' ? 'Sign Up for free' : 'Log In instead'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
