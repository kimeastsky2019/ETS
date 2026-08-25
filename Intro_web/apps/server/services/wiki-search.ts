/**
 * 위키 검색 — BM25 기반 랭킹.
 *
 * 기획서 7장의 하이브리드(BM25 ⊕ Dense → RRF) 중 **BM25 채널만** 구현한 단계다.
 * 에너지진단에서 BM25 는 선택이 아니라 필수다: 설비 모델명, 법규 조항 번호,
 * 사업장명 같은 정확 표기는 의미 유사도로 잡히지 않는다.
 *
 * Dense 채널은 코퍼스가 100건을 넘어가는 시점에 붙인다(Phase 2). 그때
 * `scoreDocuments()` 의 반환 순위와 RRF 로 융합하면 되도록 순위를 함께 돌려준다.
 */

const K1 = 1.2;
const B = 0.75;

/**
 * 한국어는 조사가 붙어 어절 단위 매칭이 자주 실패한다.
 * 어절 토큰에 더해 2-gram 을 함께 색인해 "폐열회수설비" 와 "폐열회수" 를 잇는다.
 */
export function tokenize(text: string): string[] {
  const cleaned = (text || "").toLowerCase().replace(/[^0-9a-z가-힣]+/g, " ");
  const words = cleaned.split(/\s+/).filter(Boolean);
  const tokens: string[] = [];

  for (const word of words) {
    tokens.push(word);
    if (/[가-힣]/.test(word) && word.length > 2) {
      for (let index = 0; index < word.length - 1; index += 1) {
        tokens.push(word.slice(index, index + 2));
      }
    }
  }

  return tokens;
}

export type SearchField = { text: string; weight: number };

export type SearchDoc<T> = { item: T; fields: SearchField[] };

export type SearchHit<T> = { item: T; score: number; rank: number };

/** 가중치는 필드 텍스트를 그만큼 반복하는 방식으로 반영한다. */
function docTokens(fields: SearchField[]): string[] {
  const tokens: string[] = [];
  for (const field of fields) {
    const base = tokenize(field.text);
    for (let time = 0; time < field.weight; time += 1) tokens.push(...base);
  }
  return tokens;
}

export function scoreDocuments<T>(docs: Array<SearchDoc<T>>, query: string): Array<SearchHit<T>> {
  const queryTokens = [...new Set(tokenize(query))];
  if (!queryTokens.length || !docs.length) return [];

  const tokenized = docs.map((doc) => {
    const tokens = docTokens(doc.fields);
    const frequency = new Map<string, number>();
    for (const token of tokens) frequency.set(token, (frequency.get(token) ?? 0) + 1);
    return { item: doc.item, length: tokens.length, frequency };
  });

  const avgLength = tokenized.reduce((sum, doc) => sum + doc.length, 0) / tokenized.length || 1;

  const documentFrequency = new Map<string, number>();
  for (const token of queryTokens) {
    documentFrequency.set(token, tokenized.filter((doc) => doc.frequency.has(token)).length);
  }

  const scored = tokenized.map((doc) => {
    let score = 0;

    for (const token of queryTokens) {
      const frequency = doc.frequency.get(token);
      if (!frequency) continue;

      const df = documentFrequency.get(token) ?? 0;
      const idf = Math.log(1 + (tokenized.length - df + 0.5) / (df + 0.5));
      const norm = frequency * (K1 + 1);
      const denominator = frequency + K1 * (1 - B + B * (doc.length / avgLength));
      score += idf * (norm / denominator);
    }

    return { item: doc.item, score };
  });

  return scored
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((hit, index) => ({ ...hit, rank: index + 1 }));
}

/**
 * Reciprocal Rank Fusion. Dense 채널이 붙는 시점에 두 순위를 합치는 지점.
 * 지금은 BM25 단일 채널이라 호출부가 없지만, 베이스라인 비교 코드를 미리 둔다.
 */
export function reciprocalRankFusion<T>(
  rankings: Array<Array<SearchHit<T>>>,
  key: (item: T) => string,
  k = 60
): Array<SearchHit<T>> {
  const fused = new Map<string, { item: T; score: number }>();

  for (const ranking of rankings) {
    for (const hit of ranking) {
      const id = key(hit.item);
      const previous = fused.get(id);
      const contribution = 1 / (k + hit.rank);
      if (previous) previous.score += contribution;
      else fused.set(id, { item: hit.item, score: contribution });
    }
  }

  return [...fused.values()]
    .sort((a, b) => b.score - a.score)
    .map((hit, index) => ({ ...hit, rank: index + 1 }));
}
