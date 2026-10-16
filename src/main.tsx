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

// Register Service Worker for Offline Capabilities in production
if ('serviceWorker' in navigator) {
  const isProd = Boolean((import.meta as any).env?.PROD);
  if (isProd) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch((err) => {
          console.warn('ServiceWorker registration failed: ', err);
        });
    });
  } else {
    // In development mode, automatically unregister stale service workers to prevent API interception
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('[Dev] Unregistered stale service worker');
          }
        });
      }
    }).catch(() => {
      // Ignored in dev
    });
  }
}
