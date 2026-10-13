import React from 'react';

interface NavIconProps {
  active?: boolean;
  className?: string;
}

/**
 * 🏠 Attractive Dribbble / Flaticon Style Home Icon
 * Features a multi-layered isometric study hub with electric cyan-blue-indigo roof,
 * glowing study hearth door, and luminous window accent.
 */
export const HomeNavIcon: React.FC<NavIconProps> = ({ active = false, className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`${className} transition-transform duration-200 group-hover:scale-110 drop-shadow-xs`}
  >
    <defs>
      <linearGradient id="swHomeRoofGrad" x1="2" y1="2" x2="22" y2="12" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="50%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#6366F1" />
      </linearGradient>
      <linearGradient id="swHomeDoorGrad" x1="9" y1="13" x2="15" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <linearGradient id="swHomeGlow" x1="12" y1="13" x2="12" y2="17" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
    {/* Floating study roof */}
    <path 
      d="M2.5 10.5L11.1 3.2C11.6 2.8 12.4 2.8 12.9 3.2L21.5 10.5C22.1 11.0 21.7 12 20.9 12H19V20C19 20.6 18.6 21 18 21H6C5.4 21 5 20.6 5 20V12H3.1C2.3 12 1.9 11.0 2.5 10.5Z" 
      fill="url(#swHomeRoofGrad)" 
    />
    {/* Facade depth inset */}
    <path 
      d="M6 11.2V19.5C6 19.8 6.2 20 6.5 20H17.5C17.8 20 18 19.8 18 19.5V11.2L12 6.5L6 11.2Z" 
      fill={active ? "rgba(255, 255, 255, 0.3)" : "rgba(30, 27, 75, 0.16)"} 
    />
    {/* Glowing study portal */}
    <path 
      d="M9.5 20V14.5C9.5 13.7 10.2 13 11 13H13C13.8 13 14.5 13.7 14.5 14.5V20H9.5Z" 
      fill="url(#swHomeDoorGrad)" 
    />
    {/* Center illumination orb */}
    <circle cx="12" cy="9.2" r="1.5" fill="url(#swHomeGlow)" />
    {/* Roof specular highlight */}
    <path 
      d="M11.4 3.6L3.6 10.2C3.3 10.4 3.5 10.9 3.9 10.9H5.2L12 5.2L18.8 10.9H20.1C20.5 10.9 20.7 10.4 20.4 10.2L12.6 3.6C12.3 3.3 11.7 3.3 11.4 3.6Z" 
      fill="rgba(255, 255, 255, 0.65)" 
    />
  </svg>
);

/**
 * 📁 Attractive Dribbble / Flaticon Style Workspace Icon
 * Features a rich dimensional 3D folder with warm sunset amber gradients,
 * crisp white study documents with cyan accent sheet and notebook binding.
 */
export const WorkspaceNavIcon: React.FC<NavIconProps> = ({ active = false, className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`${className} transition-transform duration-200 group-hover:scale-110 drop-shadow-xs`}
  >
    <defs>
      <linearGradient id="swWsBackTab" x1="2" y1="4" x2="14" y2="12" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#EA580C" />
        <stop offset="100%" stopColor="#C2410C" />
      </linearGradient>
      <linearGradient id="swWsFrontCover" x1="2" y1="9" x2="22" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="45%" stopColor="#F97316" />
        <stop offset="100%" stopColor="#EA580C" />
      </linearGradient>
      <linearGradient id="swWsDocWhite" x1="6" y1="3" x2="18" y2="15" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#E2E8F0" />
      </linearGradient>
      <linearGradient id="swWsDocCyan" x1="11" y1="4" x2="19" y2="14" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
    </defs>
    {/* Back folder body */}
    <path 
      d="M3 6.5C3 5.7 3.7 5 4.5 5H9.2C9.8 5 10.4 5.3 10.8 5.8L12.2 7.5H19.5C20.3 7.5 21 8.2 21 9V17C21 17.8 20.3 18.5 19.5 18.5H4.5C3.7 18.5 3 17.8 3 17V6.5Z" 
      fill="url(#swWsBackTab)" 
    />
    {/* Study document 1 peeking out */}
    <rect x="6" y="3.5" width="11" height="8" rx="1.5" fill="url(#swWsDocWhite)" />
    <path d="M8 6H13.5M8 8.5H11" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
    {/* Study note 2 peeking out with cyan tint */}
    <rect x="11.5" y="4.8" width="7.5" height="6.5" rx="1.5" fill="url(#swWsDocCyan)" />
    {/* Front folder plate with 3D angle */}
    <path 
      d="M2.5 10C2.5 9.2 3.1 8.5 3.9 8.5H20.1C20.9 8.5 21.5 9.2 21.5 10L20.8 18.3C20.7 19.3 19.9 20 18.9 20H5.1C4.1 20 3.3 19.3 3.2 18.3L2.5 10Z" 
      fill="url(#swWsFrontCover)" 
    />
    {/* Beveled top rim highlight */}
    <path 
      d="M3.9 8.5H20.1C20.7 8.5 21.2 9 21.3 9.6L21.5 10.4H2.5L2.7 9.6C2.8 9 3.3 8.5 3.9 8.5Z" 
      fill="rgba(255, 255, 255, 0.45)" 
    />
    {/* Workspace Scholar Core Emblem */}
    <circle cx="12" cy="14.5" r="2.2" fill={active ? "rgba(255,255,255,0.95)" : "rgba(255, 255, 255, 0.9)"} />
    <circle cx="12" cy="14.5" r="1.1" fill="#EA580C" />
  </svg>
);

/**
 * 🧠✨ Attractive Dribbble / Flaticon Style "Your AI Tutor" Icon
 * Features a cosmic violet-fuchsia-rose radiant starburst,
 * golden neural core orb, and dual satellite sparks in electric cyan and amber.
 */
export const AITutorNavIcon: React.FC<NavIconProps> = ({ active = false, className = "w-5 h-5" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`${className} transition-transform duration-200 group-hover:scale-115 group-hover:rotate-6 drop-shadow-sm`}
  >
    <defs>
      <linearGradient id="swAiStarGrad" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#A855F7" />
        <stop offset="25%" stopColor="#8B5CF6" />
        <stop offset="70%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#F43F5E" />
      </linearGradient>
      <linearGradient id="swAiCoreGrad" x1="9" y1="9" x2="15" y2="15" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#FDE047" />
      </linearGradient>
      <linearGradient id="swAiSparkCyan" x1="16" y1="2" x2="22" y2="8" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#818CF8" />
      </linearGradient>
      <linearGradient id="swAiSparkGold" x1="2" y1="15" x2="8" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="100%" stopColor="#F97316" />
      </linearGradient>
    </defs>
    {/* Soft aura halo */}
    <circle cx="12" cy="11.5" r="8.5" fill={active ? "rgba(255, 255, 255, 0.22)" : "rgba(168, 85, 247, 0.15)"} />
    {/* Radiant 4-point dynamic neural starburst */}
    <path 
      d="M12 2C12.4 6.8 15.2 9.6 20 10C15.2 10.4 12.4 13.2 12 18C11.6 13.2 8.8 10.4 4 10C8.8 9.6 11.6 6.8 12 2Z" 
      fill="url(#swAiStarGrad)" 
    />
    {/* Center intelligence core orb */}
    <circle cx="12" cy="10" r="2.2" fill="url(#swAiCoreGrad)" />
    {/* Secondary satellite neural spark (top-right) */}
    <path 
      d="M19 2C19.2 3.8 20.2 4.8 22 5C20.2 5.2 19.2 6.2 19 8C18.8 6.2 17.8 5.2 16 5C17.8 4.8 18.8 3.8 19 2Z" 
      fill="url(#swAiSparkCyan)" 
    />
    {/* Tertiary satellite sparkle (bottom-left) */}
    <path 
      d="M5 16C5.2 17.5 6 18.3 7.5 18.5C6 18.7 5.2 19.5 5 21C4.8 19.5 4 18.7 2.5 18.5C4 18.3 4.8 17.5 5 16Z" 
      fill="url(#swAiSparkGold)" 
    />
  </svg>
);
