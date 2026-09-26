import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { TaskProvider } from './context/TaskContext.tsx';
import { FileUploadService } from './services/FileUploadService.ts';

// Sanitize any oversized or stale browser cookies to ensure requests stay well within HTTP buffer limits
FileUploadService.sanitizeBrowserCookies();

// Asset diagnostics
const checkAssets = async () => {
  const assetsToCheck = ['/logo.png', '/favicon.png'];
  
  for (const asset of assetsToCheck) {
    try {
      const response = await fetch(asset, { method: 'HEAD' });
      if (!response.ok) {
        console.warn(`[Diagnostic Warning] Asset not found at ${asset}. Status: ${response.status}`);
      }
    } catch (error) {
      console.warn(`[Diagnostic Warning] Failed to fetch asset at ${asset}:`, error);
    }
  }
};
checkAssets();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TaskProvider>
      <App />
    </TaskProvider>
  </StrictMode>,
);

// Register Service Worker for Offline Capabilities
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((err) => {
        console.warn('ServiceWorker registration failed: ', err);
      });
  });
} else if ('serviceWorker' in navigator) {
  // In development, also register for testing offline functionality
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registered in development mode: ', registration.scope);
      })
      .catch((err) => {
        console.warn('Dev ServiceWorker registration skipped/failed: ', err);
      });
  });
}
