export type QuickDrawStroke = [number[], number[]];
export type QuickDrawDrawing = QuickDrawStroke[];

export interface DrawingEntry {
  strokes: QuickDrawDrawing;
}

const cache = new Map<string, DrawingEntry[]>();

export async function getRandomDrawing(wordEn: string): Promise<DrawingEntry | null> {
  if (!cache.has(wordEn)) {
    try {
      const fileName = wordEn.replace(/ /g, "_");
      const res = await fetch(`/drawings/${fileName}.json`);
      if (!res.ok) return null;
      const data: DrawingEntry[] = await res.json();
      cache.set(wordEn, data);
    } catch {
      return null;
    }
  }
  const drawings = cache.get(wordEn)!;
  if (drawings.length === 0) return null;

  // Filter out low-quality drawings (too few strokes or total points)
  const MIN_STROKES = 3;
  const MIN_POINTS = 40;
  const good = drawings.filter((d) => {
    const totalPoints = d.strokes.reduce((sum, s) => sum + s[0].length, 0);
    return d.strokes.length >= MIN_STROKES && totalPoints >= MIN_POINTS;
  });

  const pool = good.length > 0 ? good : drawings;
  return pool[Math.floor(Math.random() * pool.length)];
}
