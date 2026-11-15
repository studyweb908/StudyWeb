import React from 'react';
import { Lottie } from 'lottie-react';
import successAnimationData from '../../assets/successAnimation.json';

interface SuccessLottieAnimationProps {
  className?: string;
  loop?: boolean;
  speed?: number;
}

export const SuccessLottieAnimation: React.FC<SuccessLottieAnimationProps> = ({
  className = 'w-24 h-24',
  loop = false,
  speed = 1.8,
}) => {
  return (
    <div className={`flex items-center justify-center pointer-events-none select-none ${className}`} aria-hidden="true">
      <Lottie
        src={successAnimationData}
        loop={loop}
        speed={speed}
        autoplay
        className="w-full h-full"
      />
    </div>
  );
};
