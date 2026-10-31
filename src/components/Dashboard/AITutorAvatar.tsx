import React from 'react';
import { motion } from 'motion/react';
import { Workspace } from './WorkspaceTypes';

interface AITutorAvatarProps {
  workspace?: Workspace | any | null;
  sizeClass?: string;
  animateThinking?: boolean;
  className?: string;
}

/**
 * Handcrafted Academic Insignia for General Study AI Tutor mode.
 * Features a modern indigo tile, dimensional graduation mortarboard cap,
 * elegant golden tassel ribbon, and an open scholarly study tome.
 * Pure vector geometry with zero AI-slop sparkles or sci-fi orbits.
 */
export const GeneralStudyIcon: React.FC<{ sizeClass?: string; className?: string }> = ({
  sizeClass = 'w-8 h-8',
  className = ''
}) => {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} select-none shrink-0 ${className}`}
      aria-label="General Study AI Tutor"
    >
      <defs>
        {/* Rich Academic Indigo Chassis */}
        <linearGradient id="gstudyBg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#312E81" />
        </linearGradient>

        {/* Subtle Top Rim Highlight */}
        <linearGradient id="gstudyRim" x1="24" y1="4" x2="24" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Golden Academic Tassel */}
        <linearGradient id="gstudyGold" x1="12" y1="17" x2="16" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Clean Depth Shadow under Cap */}
        <filter id="capDropShadow" x="8" y="16" width="32" height="18" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#1E1B4B" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Squircle Icon Tile */}
      <rect
        x="4"
        y="4"
        width="40"
        height="40"
        rx="12"
        fill="url(#gstudyBg)"
      />

      {/* Fine Perimeter Highlight */}
      <rect
        x="4.75"
        y="4.75"
        width="38.5"
        height="38.5"
        rx="11.25"
        stroke="url(#gstudyRim)"
        strokeWidth="0.75"
      />

      {/* ========================================================= */}
      {/* 1. OPEN SCHOLARLY STUDY BOOK (Base Foundation)            */}
      {/* ========================================================= */}
      {/* Book Pages */}
      <path
        d="M24 28.5C20.5 26.2 15 26.2 11 27.5V36C15 34.8 20.5 34.8 24 37C27.5 34.8 33 34.8 37 36V27.5C33 26.2 27.5 26.2 24 28.5Z"
        fill="#EEF2FF"
      />
      {/* Spine seam */}
      <path
        d="M24 28.5V37"
        stroke="#4338CA"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Left Page Notation Marks */}
      <line x1="14.5" y1="30.2" x2="20.5" y2="31" stroke="#A5B4FC" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14.5" y1="33" x2="19.5" y2="33.7" stroke="#A5B4FC" strokeWidth="1.2" strokeLinecap="round" />
      {/* Right Page Notation Marks */}
      <line x1="27.5" y1="31" x2="33.5" y2="30.2" stroke="#A5B4FC" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="28.5" y1="33.7" x2="33.5" y2="33" stroke="#A5B4FC" strokeWidth="1.2" strokeLinecap="round" />

      {/* ========================================================= */}
      {/* 2. ACADEMIC GRADUATION MORTARBOARD CAP (Top Symbol)       */}
      {/* ========================================================= */}
      <g filter="url(#capDropShadow)">
        {/* Cap Skull Band */}
        <path
          d="M16 19.5V23.5C16 25.5 19.5 27 24 27C28.5 27 32 25.5 32 23.5V19.5C29.8 20.8 27 21.6 24 21.6C21 21.6 18.2 20.8 16 19.5Z"
          fill="#E0E7FF"
        />

        {/* Diamond Mortarboard Top - Left Facet (Direct Light) */}
        <path
          d="M24 10.5L10.5 16.5L24 22.5V10.5Z"
          fill="#FFFFFF"
        />
        {/* Diamond Mortarboard Top - Right Facet (Tonal Shade) */}
        <path
          d="M24 10.5L37.5 16.5L24 22.5V10.5Z"
          fill="#F1F5F9"
        />
      </g>

      {/* Center Mortarboard Pin / Button */}
      <circle cx="24" cy="16.5" r="1.3" fill="#CA8A04" />

      {/* Draping Academic Tassel Ribbon */}
      <path
        d="M24 16.5C20.5 16.8 13.5 18.5 12.5 22.5V26"
        stroke="url(#gstudyGold)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Tassel Bobble / Fringe */}
      <circle cx="12.5" cy="27.2" r="1.4" fill="#F59E0B" />
    </svg>
  );
};

export const GeneralStudyAcademicCrest = GeneralStudyIcon;

export const AITutorAvatar: React.FC<AITutorAvatarProps> = ({
  workspace,
  sizeClass = 'w-8 h-8',
  animateThinking = false,
  className = ''
}) => {
  const isGeneralStudy = !workspace || workspace.id === 'general-study' || workspace.id === 'local-workspace';

  // Resolve workspace custom image or logo URL
  const rawLogo = workspace?.logo || workspace?.logoUrl || workspace?.icon;
  const isCustomImage = typeof rawLogo === 'string' &&
    (rawLogo.startsWith('data:') || rawLogo.startsWith('http://') || rawLogo.startsWith('https://') || rawLogo.startsWith('/')) &&
    !rawLogo.includes('logo-inner.png');

  // Resolve theme tint colors
  const theme = workspace?.colorTheme || 'indigo';
  const themeClasses: Record<string, { bg: string; text: string; border: string }> = {
    indigo: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-400/30 dark:border-indigo-500/40'
    },
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-400/30 dark:border-emerald-500/40'
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-400/30 dark:border-amber-500/40'
    },
    rose: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-400/30 dark:border-rose-500/40'
    },
    violet: {
      bg: 'bg-violet-500/10 dark:bg-violet-500/20',
      text: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-400/30 dark:border-violet-500/40'
    },
    cyan: {
      bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
      text: 'text-cyan-600 dark:text-cyan-400',
      border: 'border-cyan-400/30 dark:border-cyan-500/40'
    }
  };

  const currentTheme = themeClasses[theme] || themeClasses.indigo;
  const workspaceEmoji = workspace?.emoji;
  const workspaceTitle = workspace?.name || 'Study Workspace';

  const renderContent = () => {
    // 1. General Study Mode: render Modern Academic Crest
    if (isGeneralStudy) {
      return (
        <GeneralStudyAcademicCrest
          sizeClass="w-full h-full"
          className="drop-shadow-xs"
        />
      );
    }

    // 2. Custom Uploaded Image Logo for Workspace
    if (isCustomImage) {
      return (
        <div className={`w-full h-full rounded-xl overflow-hidden border ${currentTheme.border} ${currentTheme.bg} flex items-center justify-center p-0.5 shadow-2xs`}>
          <img
            src={rawLogo}
            alt={`${workspaceTitle} Logo`}
            title={`AI Tutor · ${workspaceTitle}`}
            className="w-full h-full object-contain select-none"
          />
        </div>
      );
    }

    // 3. Workspace Emoji or Custom Monogram Badge with Theme Tint
    return (
      <div
        title={`AI Tutor · ${workspaceTitle}`}
        className={`w-full h-full rounded-xl border ${currentTheme.border} ${currentTheme.bg} ${currentTheme.text} flex items-center justify-center shadow-2xs select-none transition-transform`}
      >
        {workspaceEmoji ? (
          <span className="text-sm sm:text-base leading-none transform -translate-y-[0.5px]">
            {workspaceEmoji}
          </span>
        ) : (
          <span className="font-extrabold text-xs sm:text-sm tracking-tight uppercase">
            {workspaceTitle.charAt(0) || 'W'}
          </span>
        )}
      </div>
    );
  };

  if (animateThinking) {
    return (
      <motion.div
        animate={{
          scale: [0.94, 1.07, 0.94],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`${sizeClass} flex items-center justify-center shrink-0 ${className}`}
      >
        {renderContent()}
      </motion.div>
    );
  }

  return (
    <div className={`${sizeClass} flex items-center justify-center shrink-0 ${className}`}>
      {renderContent()}
    </div>
  );
};

export default AITutorAvatar;
