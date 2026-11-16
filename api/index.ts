import type { IncomingMessage, ServerResponse } from 'http';
import { createExpressApp } from '../server.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.url) {
      const parsed = new URL(req.url, 'http://localhost');
      const vercelPath = parsed.searchParams.get('__vercel_path');
      if (vercelPath !== null) {
        parsed.searchParams.delete('__vercel_path');
        const qs = parsed.searchParams.toString();
        const targetPath =
          parsed.pathname === '/api/index' ||
          parsed.pathname === '/api/index.ts' ||
          parsed.pathname === '/api'
            ? `/api/${vercelPath.replace(/^\/+/, '')}`
            : parsed.pathname;
        req.url = qs ? `${targetPath}?${qs}` : targetPath;
      }
    }

    const app = await createExpressApp();
    return app(req as any, res as any);
  } catch (err: any) {
    console.error('[Vercel API Handler Error]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'The backend service encountered an unexpected error. Please try again.',
          code: 'SERVERLESS_INIT_ERROR',
          retryable: true
        })
      );
    }
  }
}
