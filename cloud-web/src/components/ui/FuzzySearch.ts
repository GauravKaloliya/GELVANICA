export function fuzzyMatch(text: string, query: string): { score: number; indices: Set<number> } {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const indices = new Set<number>();

  if (!queryLower) return { score: 1, indices };

  if (textLower === queryLower) return { score: 100, indices: new Set(textLower.split("").map((_, i) => i)) };

  if (textLower.includes(queryLower)) {
    const start = textLower.indexOf(queryLower);
    for (let i = start; i < start + queryLower.length; i++) indices.add(i);
    const score = 50 + (queryLower.length / textLower.length) * 30 + (start === 0 ? 20 : 0);
    return { score, indices };
  }

  let queryIdx = 0;
  let score = 0;
  let consecutiveBonus = 0;
  let prevMatched = false;

  for (let i = 0; i < textLower.length && queryIdx < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIdx]) {
      indices.add(i);
      queryIdx++;
      score += 10;
      if (prevMatched) {
        consecutiveBonus += 5;
        score += consecutiveBonus;
      } else {
        consecutiveBonus = 0;
      }
      if (i === 0 || text[i - 1] === " " || text[i - 1] === "-" || text[i - 1] === "_") {
        score += 15;
      }
      prevMatched = true;
    } else {
      prevMatched = false;
      consecutiveBonus = 0;
    }
  }

  if (queryIdx < queryLower.length) return { score: 0, indices: new Set() };

  score += (queryLower.length / textLower.length) * 20;
  return { score, indices };
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getSearchable: (item: T) => string
): { item: T; score: number; indices: Set<number> }[] {
  if (!query) return items.map((item) => ({ item, score: 1, indices: new Set<number>() }));

  return items
    .map((item) => {
      const searchable = getSearchable(item);
      const result = fuzzyMatch(searchable, query);
      return { item, ...result };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function highlightFuzzyMatch(text: string, indices: Set<number>): React.ReactNode[] {
  const chars = text.split("");
  const parts: React.ReactNode[] = [];
  let current: string[] = [];
  let inHighlight = false;

  chars.forEach((char, i) => {
    const isMatch = indices.has(i);
    if (isMatch !== inHighlight) {
      if (current.length > 0) {
        parts.push(inHighlight ? `<mark>${current.join("")}</mark>` : current.join(""));
      }
      current = [];
      inHighlight = isMatch;
    }
    current.push(char);
  });

  if (current.length > 0) {
    parts.push(inHighlight ? `<mark>${current.join("")}</mark>` : current.join(""));
  }

  return parts;
}
