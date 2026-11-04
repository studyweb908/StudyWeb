import React, { useId } from 'react';
import { motion } from 'motion/react';

export interface PremiumFlameProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'celebration';
  active?: boolean;
  animated?: boolean;
  showParticles?: boolean;
  transformationStage?: 'small' | 'expanding' | 'full';
  className?: string;
}

const SIZE_DIMENSIONS: Record<NonNullable<PremiumFlameProps['size']>, { w: number; h: number }> = {
  sm: { w: 28, h: 32 },
  md: { w: 46, h: 52 },
  lg: { w: 72, h: 82 },
  xl: { w: 108, h: 124 },
  celebration: { w: 136, h: 156 },
};

const EMBER_PARTICLES = [
  { id: 1, x: -24, yStart: 12, yEnd: -44, size: 5, delay: 0.0, duration: 2.1, color: '#FFD54F' },
  { id: 2, x: 26, yStart: 16, yEnd: -48, size: 4, delay: 0.35, duration: 2.3, color: '#FF9800' },
  { id: 3, x: -14, yStart: -6, yEnd: -58, size: 3.5, delay: 0.7, duration: 1.9, color: '#FFF59D' },
  { id: 4, x: 16, yStart: -4, yEnd: -54, size: 4.5, delay: 1.05, duration: 2.2, color: '#FFB300' },
  { id: 5, x: 0, yStart: -18, yEnd: -66, size: 3.5, delay: 0.5, duration: 2.0, color: '#FFE082' },
  { id: 6, x: -30, yStart: 24, yEnd: -28, size: 3, delay: 1.25, duration: 2.4, color: '#FF6D00' },
];

export const PremiumFlame: React.FC<PremiumFlameProps> = ({
  size = 'md',
  active = true,
  animated = true,
  showParticles = true,
  transformationStage = 'full',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const dims = SIZE_DIMENSIONS[size] || SIZE_DIMENSIONS.md;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const shouldAnimate = animated && !prefersReducedMotion;

  const scaleValue =
    transformationStage === 'small'
      ? 0.42
      : transformationStage === 'expanding'
      ? 1.12
      : 1;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: dims.w, height: dims.h }}
      aria-hidden="true"
    >
      {/* 1. Soft Ambient Radial Aura */}
      <motion.div
        initial={false}
        animate={
          shouldAnimate && active
            ? {
                scale:
                  transformationStage === 'small'
                    ? 0.45
                    : [1, 1.12, 1],
                opacity:
                  transformationStage === 'small'
                    ? 0.35
                    : [0.55, 0.85, 0.55],
              }
            : { scale: active ? 1 : 0.8, opacity: active ? 0.5 : 0.18 }
        }
        transition={{
          duration: 2.6,
          repeat: shouldAnimate ? Infinity : 0,
          ease: 'easeInOut',
        }}
        className="pointer-events-none absolute inset-0 rounded-full blur-xl"
        style={{
          background: active
            ? 'radial-gradient(circle, rgba(255, 160, 0, 0.58) 0%, rgba(255, 61, 0, 0.28) 52%, rgba(255, 61, 0, 0) 78%)'
            : 'radial-gradient(circle, rgba(148, 163, 184, 0.25) 0%, transparent 70%)',
        }}
      />

      {/* 2. Subtle Glowing Ember Particles */}
      {shouldAnimate && active && showParticles && transformationStage !== 'small' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {EMBER_PARTICLES.map((p) => {
            const scaleFactor = dims.w / 100;
            return (
              <motion.span
                key={p.id}
                initial={{
                  x: p.x * scaleFactor,
                  y: p.yStart * scaleFactor,
                  opacity: 0,
                  scale: 0.4,
                }}
                animate={{
                  x: [
                    p.x * scaleFactor,
                    (p.x + (p.id % 2 === 0 ? 5 : -5)) * scaleFactor,
                    p.x * scaleFactor,
                  ],
                  y: [p.yStart * scaleFactor, p.yEnd * scaleFactor],
                  opacity: [0, 0.92, 0],
                  scale: [0.4, 1, 0.25],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                style={{
                  width: Math.max(2.5, p.size * scaleFactor),
                  height: Math.max(2.5, p.size * scaleFactor),
                  backgroundColor: p.color,
                  boxShadow: `0 0 8px ${p.color}`,
                }}
                className="absolute rounded-full"
              />
            );
          })}
        </div>
      )}

      {/* 3. Multi-Layered Vector Flame with Smooth Transformation & Floating Motion */}
      <motion.div
        initial={false}
        animate={
          shouldAnimate
            ? {
                scale: scaleValue,
                y: active ? [0, -3.5, 0] : 0,
              }
            : { scale: scaleValue, y: 0 }
        }
        transition={{
          scale: { type: 'spring', stiffness: 260, damping: 20 },
          y: {
            duration: 2.4,
            repeat: shouldAnimate && active ? Infinity : 0,
            ease: 'easeInOut',
          },
        }}
        className="relative z-10 w-full h-full flex items-center justify-center"
      >
        <svg
          width={dims.w}
          height={dims.h}
          viewBox="0 0 120 138"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={
            active
              ? 'drop-shadow-[0_6px_22px_rgba(255,111,0,0.52)]'
              : 'opacity-75 grayscale-[35%]'
          }
        >
          <defs>
            {/* Outer Crimson-to-Amber Gradient */}
            <linearGradient
              id={`flameOuter-${uid}`}
              x1="60"
              y1="6"
              x2="60"
              y2="128"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor={active ? '#FFB300' : '#94A3B8'} />
              <stop offset="38%" stopColor={active ? '#FF6D00' : '#64748B'} />
              <stop offset="76%" stopColor={active ? '#F4511E' : '#475569'} />
              <stop offset="100%" stopColor={active ? '#D50000' : '#334155'} />
            </linearGradient>

            {/* Mid Golden-Orange Gradient */}
            <linearGradient
              id={`flameMid-${uid}`}
              x1="60"
              y1="28"
              x2="60"
              y2="122"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor={active ? '#FFD54F' : '#CBD5E1'} />
              <stop offset="50%" stopColor={active ? '#FFA000' : '#94A3B8'} />
              <stop offset="100%" stopColor={active ? '#FF6D00' : '#64748B'} />
            </linearGradient>

            {/* Inner Radiant Gold-White Core */}
            <radialGradient
              id={`flameCore-${uid}`}
              cx="50%"
              cy="68%"
              r="46%"
            >
              <stop offset="0%" stopColor={active ? '#FFFFFF' : '#F1F5F9'} />
              <stop offset="45%" stopColor={active ? '#FFF59D' : '#E2E8F0'} />
              <stop offset="100%" stopColor={active ? '#FFC107' : '#94A3B8'} />
            </radialGradient>
          </defs>

          {/* Outer Sculpted Flame Crest */}
          <path
            d="M61.5 6C61.5 6 93 40.5 93 81C93 106.5 78.5 125 60 125C41.5 125 27 106.5 27 81C27 59.5 41.5 42.5 49.5 29.5C48.5 42.5 55.5 51 55.5 51C52 33.5 61.5 6 61.5 6Z"
            fill={`url(#flameOuter-${uid})`}
          />

          {/* Secondary Side Flame Flicker Wing */}
          <path
            d="M78 46C83.5 57.5 87 69 86 83C85 103 73.5 119 60 119C68 111 72.5 97 71 81C70 70 65.5 61 63 54C69.5 55.5 75.5 51.5 78 46Z"
            fill={active ? '#FF8F00' : '#64748B'}
            opacity="0.55"
          />

          {/* Mid Warm Golden Tongue */}
          <path
            d="M60.5 34C60.5 34 82 58.5 82 85.5C82 104.5 72 118 60 118C48 118 38 104.5 38 85.5C38 69 48.5 56.5 54 46C53 54.5 58.5 61 58.5 61C56.5 48.5 60.5 34 60.5 34Z"
            fill={`url(#flameMid-${uid})`}
          />

          {/* Inner Luminous Seed */}
          <path
            d="M60 63C60 63 73 79.5 73 96.5C73 107.5 67 115 60 115C53 115 47 107.5 47 96.5C47 84 53.5 73.5 56.8 67.2C56 71.5 59.8 75.5 59.8 75.5C58.8 69.5 60 63 60 63Z"
            fill={`url(#flameCore-${uid})`}
          />
        </svg>
      </motion.div>
    </div>
  );
};

export default PremiumFlame;
