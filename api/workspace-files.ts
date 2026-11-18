import type { IncomingMessage, ServerResponse } from 'http';

interface ApiRequest extends IncomingMessage {
  body?: any;
  method?: string;
}

interface ApiResponse extends ServerResponse {
  status: (code: number) => ApiResponse;
  json: (data: any) => void;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  return res.status(200).json({
    files: []
  });
}
