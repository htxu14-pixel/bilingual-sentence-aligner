export type Language = 'Chinese' | 'English' | 'Unknown';

export function detectLanguage(text: string): Language {
  let chineseCount = 0;
  let englishCount = 0;
  let otherCount = 0;

  for (const char of text) {
    const code = char.charCodeAt(0);
    if ((code >= 0x4E00 && code <= 0x9FFF) ||
        (code >= 0x3400 && code <= 0x4DBF) ||
        (code >= 0x20000 && code <= 0x2A6DF) ||
        (code >= 0x2A700 && code <= 0x2B73F) ||
        (code >= 0x2B740 && code <= 0x2B81F) ||
        (code >= 0x2B820 && code <= 0x2CEAF) ||
        (code >= 0xF900 && code <= 0xFAFF)) {
      chineseCount++;
    } else if ((code >= 0x41 && code <= 0x5A) ||
               (code >= 0x61 && code <= 0x7A)) {
      englishCount++;
    } else {
      otherCount++;
    }
  }

  const total = chineseCount + englishCount;
  if (total === 0) return 'Unknown';

  const chineseRatio = chineseCount / total;
  const englishRatio = englishCount / total;

  if (chineseRatio > 0.6) return 'Chinese';
  if (englishRatio > 0.6) return 'English';
  if (chineseRatio > englishRatio) return 'Chinese';
  if (englishRatio > chineseRatio) return 'English';
  return 'Unknown';
}
