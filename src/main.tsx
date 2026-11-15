import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { TaskProvider } from './context/TaskContext.tsx';
import { FileUploadService } from './services/FileUploadService.ts';

// Sanitize any oversized or stale browser cookies to ensure requests stay well within HTTP buffer limits
FileUploadService.sanitizeBrowserCookies();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TaskProvider>
      <App />
    </TaskProvider>
  </StrictMode>,
);

// Register Service Worker for Offline Capabilities & Generated Quiz Caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        registration.update().catch(() => {});
      })
      .catch((err) => {
        console.warn('ServiceWorker registration failed: ', err);
      });
  });
}
