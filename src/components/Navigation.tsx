import React, { useState, useEffect, useRef } from 'react';
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
  EyeOff,
  ImagePlus
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { supabase } from '../lib/supabase';

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<any>(null);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 256;
          const MAX_HEIGHT = 256;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            setProfilePic(resizedBase64);
            try {
              localStorage.setItem('studyweb_profile_pic', resizedBase64);
              localStorage.setItem('studyweb_profile_avatar', resizedBase64);
            } catch (err) {
              console.warn('Storage quota exceeded, skipping local persistence');
            }
          }
        };
        if (event.target?.result) {
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Track the current scrolled section to dynamically highlight active state
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
      
      if (isProgrammaticScrollRef.current) return;
      
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

    const handleOpenAuthModal = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: 'login' | 'signup' }>;
      const mode = customEvent.detail?.mode || 'login';
      setAuthMode(mode);
      setIsAuthModalOpen(true);
    };

    (window as any).openStudyWebAuth = (mode?: 'login' | 'signup') => {
      setAuthMode(mode || 'login');
      setIsAuthModalOpen(true);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('open-auth-modal', handleOpenAuthModal);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('open-auth-modal', handleOpenAuthModal);
      delete (window as any).openStudyWebAuth;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, key: string) => {
    e.preventDefault();
    setActiveSection(key);
    isProgrammaticScrollRef.current = true;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const finishScroll = () => {
      isProgrammaticScrollRef.current = false;
    };

    const id = href === '#' ? '' : href.replace('#', '');
    const el = id ? document.getElementById(id) : null;

    if (href === '#') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (el) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    } else {
      isProgrammaticScrollRef.current = false;
      return;
    }

    // Use debounced scrolling to release lock when scrolling strictly stops
    const onScrollDebounce = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        window.removeEventListener('scroll', onScrollDebounce);
        finishScroll();
      }, 100);
    };

    window.addEventListener('scroll', onScrollDebounce);
    
    // Safety fallback
    scrollTimeoutRef.current = setTimeout(() => {
      window.removeEventListener('scroll', onScrollDebounce);
      finishScroll();
    }, 1200);
  };

  const navLinks = [
    { 
      name: 'Home', 
      href: '#', 
      key: 'home', 
      icon: <Home className="w-4 h-4" />,
      colorClass: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-50/90 dark:bg-blue-950/40',
      borderClass: 'border-blue-100 dark:border-blue-900/30'
    },
    { 
      name: 'For Students', 
      href: '#for-students', 
      key: 'for-students', 
      icon: <GraduationCap className="w-4 h-4" />,
      colorClass: 'text-indigo-600 dark:text-indigo-400',
      bgClass: 'bg-indigo-50/90 dark:bg-indigo-950/40',
      borderClass: 'border-indigo-100 dark:border-indigo-900/30'
    },
    { 
      name: 'Features', 
      href: '#study-tools', 
      key: 'study-tools', 
      icon: <Sparkles className="w-4 h-4" />,
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50/90 dark:bg-amber-950/40',
      borderClass: 'border-amber-100 dark:border-amber-900/30'
    },
    { 
      name: 'Pricing', 
      href: '#pricing', 
      key: 'pricing', 
      icon: <CreditCard className="w-4 h-4" />,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-50/90 dark:bg-emerald-950/40',
      borderClass: 'border-emerald-100 dark:border-emerald-900/30'
    },
    { 
      name: 'Contact', 
      href: '#contact', 
      key: 'contact', 
      icon: <Mail className="w-4 h-4" />,
      colorClass: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-50/90 dark:bg-rose-950/40',
      borderClass: 'border-rose-100 dark:border-rose-900/30'
    },
  ];

  const bottomNavLinks = [
    { 
      name: 'Home', 
      href: '#', 
      icon: <Home className="w-5 h-5" />, 
      key: 'home',
      colorClass: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-50 dark:bg-blue-950/40'
    },
    { 
      name: 'Students', 
      href: '#for-students', 
      icon: <GraduationCap className="w-5 h-5" />, 
      key: 'for-students',
      colorClass: 'text-indigo-600 dark:text-indigo-400',
      bgClass: 'bg-indigo-50 dark:bg-indigo-950/40'
    },
    { 
      name: 'Features', 
      href: '#study-tools', 
      icon: <Sparkles className="w-5 h-5" />, 
      key: 'study-tools',
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-950/40'
    },
    { 
      name: 'Pricing', 
      href: '#pricing', 
      icon: <CreditCard className="w-5 h-5" />, 
      key: 'pricing',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/40'
    },
    { 
      name: 'Login', 
      onClick: () => { 
        setIsAuthModalOpen(true); 
        setAuthMode('login'); 
      }, 
      icon: <LogIn className="w-5 h-5" />, 
      key: 'login',
      colorClass: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-50 dark:bg-rose-950/40'
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
            ? 'bg-white/85 dark:bg-slate-950/85 backdrop-blur-md shadow-md py-3 border-b border-slate-200/50 dark:border-slate-850/50'
            : 'bg-transparent py-5'
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
              <div className="flex gap-2 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-100 dark:border-slate-800/40">
                {navLinks.map((link) => {
                  const isActive = activeSection === link.key;
                  return (
                    <motion.a
                      key={link.name}
                      href={link.href}
                      onClick={(e) => handleLinkClick(e, link.href, link.key)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all relative isolate group cursor-pointer ${
                        isActive 
                          ? `${link.colorClass} font-extrabold` 
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="desktopActivePill" 
                          className={`absolute inset-0 ${link.bgClass} rounded-full -z-10 shadow-sm border ${link.borderClass}`} 
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className={`flex items-center justify-center transition-colors duration-200 ${
                        isActive
                          ? link.colorClass
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                      }`}>
                        {link.icon}
                      </span>
                      <span>{link.name}</span>
                    </motion.a>
                  );
                })}
              </div>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <motion.button 
                  onClick={() => { setIsAuthModalOpen(true); setAuthMode('login'); }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer focus:outline-none"
                >
                  Login
                </motion.button>
                <motion.button 
                  onClick={() => { setIsAuthModalOpen(true); setAuthMode('signup'); }}
                  whileHover={{ y: -1, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-5 py-2 rounded-full text-xs font-bold transition-all shadow-sm shadow-indigo-600/10 dark:shadow-indigo-500/15 hover:shadow-md hover:shadow-indigo-600/20 dark:hover:shadow-indigo-500/30 cursor-pointer border border-indigo-600/10 dark:border-indigo-400/20 focus:outline-none"
                >
                  Sign Up
                </motion.button>
              </div>
            </div>

            {/* Mobile Actions Header (Theme toggle & simplified Quick CTA) */}
            <div className="md:hidden flex items-center gap-3">
              <ThemeToggle />
              <motion.button 
                onClick={() => { setIsAuthModalOpen(true); setAuthMode('signup'); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 px-4 py-1.5 rounded-full text-xs font-bold transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/60 focus:outline-none"
              >
                Go Pro
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Fixed Docked Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-around relative max-w-lg mx-auto px-2 pt-2.5 pb-6">
          {bottomNavLinks.map((link) => {
            const isActive = link.key === 'login' ? isAuthModalOpen : activeSection === link.key;
            
            const content = (
              <>
                <div className={`transition-all duration-300 relative z-10 ${
                  isActive 
                    ? `${link.colorClass} scale-110 font-bold` 
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                }`}>
                  {link.icon}
                </div>
                <span className={`text-[10px] font-extrabold tracking-tight relative z-10 transition-colors duration-300 ${
                  isActive 
                    ? 'text-slate-900 dark:text-slate-100 font-bold' 
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600'
                }`}>
                  {link.name}
                </span>
              </>
            );

            if (link.onClick) {
              return (
                <motion.button
                  key={link.name}
                  onClick={link.onClick}
                  whileTap={{ scale: 0.92 }}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1.5 relative cursor-pointer group focus:outline-none"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeMobileTabIndicator"
                      className={`absolute inset-x-2 inset-y-0.5 rounded-2xl ${link.bgClass} border border-slate-100/50 dark:border-slate-850/30 shadow-sm`}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {content}
                </motion.button>
              );
            }

            return (
              <motion.a
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href, link.key)}
                whileTap={{ scale: 0.92 }}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1.5 relative cursor-pointer group"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeMobileTabIndicator"
                    className={`absolute inset-x-2 inset-y-0.5 rounded-2xl ${link.bgClass} border border-slate-100/50 dark:border-slate-850/30 shadow-sm`}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {content}
              </motion.a>
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

              {/* Form */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthError('');
                  
                  if (password.length < 6) {
                    setAuthError('Password should be at least 6 characters.');
                    return;
                  }

                  setAuthLoading(true);
                  try {
                    if (!supabase) {
                      // Mock auth if no supabase configured
                      if (authMode === 'signup') {
                        (window as any).showToast?.('Welcome! Your StudyWeb account has been created.', 'success');
                        window.dispatchEvent(new CustomEvent('studyweb-signup-success'));
                      } else {
                        (window as any).showToast?.('Successfully logged in to StudyWeb!', 'success');
                        localStorage.setItem('studyweb_is_logged_in', 'true');
                        window.dispatchEvent(new CustomEvent('studyweb-login-success'));
                      }
                      setIsAuthModalOpen(false);
                      return;
                    }

                    if (authMode === 'signup') {
                      const { data, error } = await supabase.auth.signUp({
                        email: email.trim(),
                        password,
                        options: {
                          data: {
                            full_name: fullName.trim(),
                            avatar_url: profilePic || ''
                          }
                        }
                      });
                      if (error) throw error;

                      // Check if already registered (Supabase sometimes returns an empty identities array for existing users)
                      if (data?.user?.identities && data.user.identities.length === 0) {
                        setAuthError('User already registered. Please log in with your password.');
                        return;
                      }
                      
                      if (data.session) {
                        // Email confirmation disabled in Supabase: session created immediately
                        localStorage.setItem('studyweb_is_logged_in', 'true');
                        if (data.user) {
                          try {
                            await supabase.from('profiles').upsert({
                              id: data.user.id,
                              email: data.user.email || email.trim(),
                              full_name: fullName.trim(),
                              avatar_url: profilePic || ''
                            });
                          } catch (pErr) {
                            console.warn('Profile initial record sync notice:', pErr);
                          }
                        }

                        // Clear stale local onboarding
                        ['studyweb_profile_name', 'studyweb_profile_avatar', 'studyweb_profile_class_board', 'studyweb_profile_school', 'studyweb_onboarding_draft', 'studyweb_onboarding_data'].forEach(k => localStorage.removeItem(k));
                        localStorage.removeItem('studyweb_onboarding_complete');

                        (window as any).showToast?.('Welcome! Your StudyWeb account has been created.', 'success');
                        window.dispatchEvent(new CustomEvent('studyweb-signup-success'));
                        setIsAuthModalOpen(false);
                      } else if (data.user) {
                        // Email confirmation enabled: inform user
                        (window as any).showToast?.('Registration successful! Please check your email inbox to confirm your account.', 'info');
                        setAuthError('Registration email sent! Please verify your inbox, then log in.');
                        setAuthMode('login');
                      }
                    } else {
                      const { data, error } = await supabase.auth.signInWithPassword({
                        email: email.trim(),
                        password,
                      });
                      if (error) throw error;

                      // Clear any stale local data
                      ['studyweb_profile_name', 'studyweb_profile_avatar', 'studyweb_profile_class_board', 'studyweb_profile_school', 'studyweb_onboarding_draft', 'studyweb_onboarding_data'].forEach(k => localStorage.removeItem(k));
                      
                      localStorage.setItem('studyweb_onboarding_complete', 'true');
                      localStorage.setItem('studyweb_is_logged_in', 'true');
                      (window as any).showToast?.('Successfully logged in to StudyWeb!', 'success');
                      window.dispatchEvent(new CustomEvent('studyweb-login-success'));
                      setIsAuthModalOpen(false);
                    }
                  } catch (err: any) {
                    console.error('Auth error:', err);
                    let errMsg = err.message || 'Authentication failed';
                    if (errMsg === 'Failed to fetch') {
                      errMsg = 'Network error or adblocker prevented connection to auth server. Please check your connection.';
                    } else if (errMsg.toLowerCase().includes('invalid login credentials')) {
                      errMsg = 'Invalid login credentials. Please verify your email and password, or create an account if you are new.';
                    } else if (errMsg.toLowerCase().includes('user already registered')) {
                      errMsg = 'User already registered with this email. Please switch to Log In.';
                    } else if (errMsg.toLowerCase().includes('password should be at least')) {
                      errMsg = 'Password should be at least 6 characters.';
                    }
                    setAuthError(errMsg);
                  } finally {
                    setAuthLoading(false);
                  }
                }} 
                className="space-y-4"
              >
                {authError && (
                  <div className="text-red-500 text-xs font-medium bg-red-500/10 border border-red-500/20 p-3 rounded-xl space-y-2">
                    <p className="font-semibold">{authError}</p>
                    {authError.toLowerCase().includes('already registered') && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthError('');
                          setAuthMode('login');
                        }}
                        className="text-xs text-brand-primary underline font-bold hover:opacity-80 block"
                      >
                        👉 Click here to switch to Log In
                      </button>
                    )}
                    {authError.toLowerCase().includes('invalid login credentials') && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthError('');
                          setAuthMode('signup');
                        }}
                        className="text-xs text-brand-primary underline font-bold hover:opacity-80 block"
                      >
                        👉 Don't have an account? Click here to Sign Up
                      </button>
                    )}
                  </div>
                )}
                {authMode === 'signup' && (
                  <>
                    <div className="space-y-1.5 flex flex-col items-center pb-2">
                      <div className="relative group cursor-pointer w-20 h-20 rounded-full bg-card-bg/50 dark:bg-brand-bg-dark/50 border border-card-border flex items-center justify-center overflow-hidden mb-1">
                        {profilePic ? (
                          <img src={profilePic} alt="Profile preview" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-brand-text-light group-hover:text-brand-primary transition-colors duration-200" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <ImagePlus className="w-6 h-6 text-white" />
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePicChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <label className="text-[10px] font-bold text-brand-text-light text-center">
                        Upload Profile Picture (Optional)
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-brand-text-light" />
                        Full Name
                      </label>
                      <div className="relative text-brand-text-light focus-within:text-brand-primary transition-colors duration-200">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-card-border bg-card-bg/50 dark:bg-brand-bg-dark/50 backdrop-blur-sm text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-brand-text-light" />
                    Email Address
                  </label>
                  <div className="relative text-brand-text-light focus-within:text-brand-primary transition-colors duration-200">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-card-border bg-card-bg/50 dark:bg-brand-bg-dark/50 backdrop-blur-sm text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-brand-text-light" />
                      Password
                    </label>
                    {authMode === 'login' && (
                      <a href="#contact" onClick={() => setIsAuthModalOpen(false)} className="text-[10px] text-brand-primary hover:underline font-bold">
                        Forgot Password?
                      </a>
                    )}
                  </div>
                  <div className="relative text-brand-text-light focus-within:text-brand-primary transition-colors duration-200">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••• (at least 6 characters)"
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
                  {password.length > 0 && password.length < 6 && (
                    <p className="text-[11px] text-amber-500 font-medium pl-1">
                      Password should be at least 6 characters (currently {password.length})
                    </p>
                  )}
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
                  disabled={authLoading}
                  className="w-full bg-brand-primary hover:bg-brand-secondary text-white py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-lg shadow-brand-primary/10 hover:shadow-xl hover:shadow-brand-secondary/25 flex items-center justify-center gap-2 group cursor-pointer mt-2 disabled:opacity-70"
                >
                  {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Log In' : 'Create Free Account')}
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
