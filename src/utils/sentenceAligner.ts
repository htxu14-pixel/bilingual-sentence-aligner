export interface AlignedSentence {
  id: string;
  chinese: string;
  english: string;
}

export function alignSentences(chineseSentences: string[], englishSentences: string[]): AlignedSentence[] {
  const maxLength = Math.max(chineseSentences.length, englishSentences.length);
  const result: AlignedSentence[] = [];

  for (let i = 0; i < maxLength; i++) {
    result.push({
      id: `row-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
      chinese: chineseSentences[i] || '',
      english: englishSentences[i] || '',
    });
  }

  return result;
}
