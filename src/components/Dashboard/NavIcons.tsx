import React from 'react';

interface NavIconProps {
  id: string;
  filled?: boolean;
  className?: string;
}

/**
 * Crisp, pixel-aligned navigation icons with Instagram-style
 * outline (inactive) -> solid filled interior (active/hover) states.
 */
export const NavIcon: React.FC<NavIconProps> = ({ id, filled = false, className = 'w-5 h-5' }) => {
  switch (id) {
    case 'dashboard':
      return filled ? (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M12.71 2.29a1 1 0 0 0-1.42 0l-9 9a1 1 0 0 0 .71 1.71H4v7a2 2 0 0 0 2 2h3.5a.5.5 0 0 0 .5-.5V16a2 2 0 0 1 4 0v5.5a.5.5 0 0 0 .5.5H18a2 2 0 0 0 2-2v-7h1a1 1 0 0 0 .71-1.71l-9-9Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V19a2 2 0 0 0 2 2h3v-5a2 2 0 0 1 4 0v5h3a2 2 0 0 0 2-2V9.5" />
        </svg>
      );

    case 'workspaces':
      return filled ? (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.59l-1.7-1.7A1 1 0 0 0 10 4H4Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6a2 2 0 0 1 2-2h4.6a1 1 0 0 1 .7.3L12 6h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />
        </svg>
      );

    case 'ai-tutor':
      return filled ? (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M12 2.5a.75.75 0 0 1 .71.51l1.79 5.39 5.39 1.79a.75.75 0 0 1 0 1.42l-5.39 1.79-1.79 5.39a.75.75 0 0 1-1.42 0l-1.79-5.39-5.39-1.79a.75.75 0 0 1 0-1.42l5.39-1.79 1.79-5.39A.75.75 0 0 1 12 2.5Z" />
          <path d="M19 15.5a.6.6 0 0 1 .57.41l.59 1.78 1.78.59a.6.6 0 0 1 0 1.14l-1.78.59-.59 1.78a.6.6 0 0 1-1.14 0l-.59-1.78-1.78-.59a.6.6 0 0 1 0-1.14l1.78-.59.59-1.78a.6.6 0 0 1 .57-.41Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l1.8 5.4L19.2 10.2l-5.4 1.8L12 17.4l-1.8-5.4-5.4-1.8 5.4-1.8L12 3Z" />
          <path d="M19 15.5l.65 1.85 1.85.65-1.85.65L19 20.5l-.65-1.85-1.85-.65 1.85-.65.65-1.85Z" />
        </svg>
      );

    case 'scan-notes':
      return filled ? (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd" d="M9.17 4a2 2 0 0 0-1.66.89L6.44 6.5H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-8a3 3 0 0 0-3-3h-1.44l-1.07-1.61A2 2 0 0 0 14.83 4H9.17ZM12 9.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.5 4h-5L7.5 6.5H5a2.5 2.5 0 0 0-2.5 2.5v8.5A2.5 2.5 0 0 0 5 20h14a2.5 2.5 0 0 0 2.5-2.5V9A2.5 2.5 0 0 0 19 6.5h-2.5L14.5 4Z" />
          <circle cx="12" cy="13" r="3.25" />
        </svg>
      );

    case 'quiz-center':
      return filled ? (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M12 2a6.5 6.5 0 0 0-6.5 6.5c0 2.02.92 3.82 2.37 5.01L6.5 21.2a.75.75 0 0 0 1.12.77L12 19.35l4.38 2.62a.75.75 0 0 0 1.12-.77l-1.37-7.69A6.49 6.49 0 0 0 18.5 8.5 6.5 6.5 0 0 0 12 2Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8.5" r="5.5" />
          <path d="M8.5 13.2 7 21l5-2.8L17 21l-1.5-7.8" />
        </svg>
      );

    case 'settings':
      return filled ? (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd" d="M10.33 2.52a2 2 0 0 1 3.34 0l.43.65a1.5 1.5 0 0 0 1.72.62l.75-.25a2 2 0 0 1 2.58 1.49l.17.77a1.5 1.5 0 0 0 1.25 1.16l.78.12a2 2 0 0 1 1.67 2.48l-.21.76a1.5 1.5 0 0 0 .56 1.61l.63.48a2 2 0 0 1 0 3.16l-.63.48a1.5 1.5 0 0 0-.56 1.61l.21.76a2 2 0 0 1-1.67 2.48l-.78.12a1.5 1.5 0 0 0-1.25 1.16l-.17.77a2 2 0 0 1-2.58 1.49l-.75-.25a1.5 1.5 0 0 0-1.72.62l-.43.65a2 2 0 0 1-3.34 0l-.43-.65a1.5 1.5 0 0 0-1.72-.62l-.75.25a2 2 0 0 1-2.58-1.49l-.17-.77a1.5 1.5 0 0 0-1.25-1.16l-.78-.12a2 2 0 0 1-1.67-2.48l.21-.76a1.5 1.5 0 0 0-.56-1.61l-.63-.48a2 2 0 0 1 0-3.16l.63-.48a1.5 1.5 0 0 0 .56-1.61l-.21-.76A2 2 0 0 1 4.85 4.2l.78-.12a1.5 1.5 0 0 0 1.25-1.16l.17-.77A2 2 0 0 1 9.63.66l.75.25a1.5 1.5 0 0 0 1.72-.62l.43-.65ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      );

    case 'profile':
    default:
      return filled ? (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M12 3a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM4 19.5A5.5 5.5 0 0 1 9.5 14h5a5.5 5.5 0 0 1 5.5 5.5.5.5 0 0 1-.5.5h-15a.5.5 0 0 1-.5-.5Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="7.5" r="4" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
      );
  }
};
