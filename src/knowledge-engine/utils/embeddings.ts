import { GoogleGenAI } from '@google/genai';

export function vectorToBlob(vector: number[]): Buffer {
  const floatArray = new Float32Array(vector);
  return Buffer.from(floatArray.buffer);
}

export function blobToVector(blob: Buffer): number[] {
  const floatArray = new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / Float32Array.BYTES_PER_ELEMENT);
  return Array.from(floatArray);
}

export async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });
    const res = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: text
    }) as any;
    if (res && res.embeddings && res.embeddings[0] && res.embeddings[0].values) {
      return res.embeddings[0].values;
    }
    if (res && res.embedding && res.embedding.values) {
      return res.embedding.values;
    }
  } catch (err) {
    console.error("Embedding generation failed", err);
  }
  return null;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
