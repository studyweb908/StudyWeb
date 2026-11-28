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
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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
