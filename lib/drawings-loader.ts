export type QuickDrawStroke = [number[], number[]];
export type QuickDrawDrawing = QuickDrawStroke[];

export interface DrawingEntry {
  strokes: QuickDrawDrawing;
}

const cache = new Map<string, DrawingEntry[]>();

export async function getRandomDrawing(wordEn: string): Promise<DrawingEntry | null> {
  if (!cache.has(wordEn)) {
    try {
      const res = await fetch(`/drawings/${wordEn}.json`);
      if (!res.ok) return null;
      const data: DrawingEntry[] = await res.json();
      cache.set(wordEn, data);
    } catch {
      return null;
    }
  }
  const drawings = cache.get(wordEn)!;
  if (drawings.length === 0) return null;
  return drawings[Math.floor(Math.random() * drawings.length)];
}
