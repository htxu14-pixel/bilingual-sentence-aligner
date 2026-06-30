import type { Language } from './languageDetector';

const ENGLISH_ABBREVIATIONS = [
  'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.',
  'e.g.', 'i.e.', 'etc.', 'vs.', 'v.',
  'U.S.', 'U.K.', 'U.N.', 'E.U.',
  'Jan.', 'Feb.', 'Mar.', 'Apr.', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.',
  'a.m.', 'p.m.',
  'St.', 'Ave.', 'Rd.', 'Blvd.',
  'Inc.', 'Ltd.', 'Co.',
];

const CHINESE_END_PUNCTUATION = ['。', '！', '？', '；'];
const ENGLISH_END_PUNCTUATION = ['.', '?', '!', ';'];

export function splitIntoSentences(text: string, lang: Language): string[] {
  const sentences: string[] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    if (lang === 'Chinese') {
      sentences.push(...splitChineseLine(trimmedLine));
    } else if (lang === 'English') {
      sentences.push(...splitEnglishLine(trimmedLine));
    } else {
      sentences.push(trimmedLine);
    }
  }

  return sentences.filter(s => s.trim());
}

function splitChineseLine(line: string): string[] {
  const sentences: string[] = [];
  let current = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    current += char;

    if (CHINESE_END_PUNCTUATION.includes(char)) {
      let lookAhead = i + 1;
      while (lookAhead < line.length) {
        const nextChar = line[lookAhead];
        if (nextChar === '”' || nextChar === '’' || nextChar === '）' || nextChar === '】' || nextChar === '》') {
          current += nextChar;
          lookAhead++;
        } else {
          break;
        }
      }
      sentences.push(current.trim());
      current = '';
      i = lookAhead - 1;
    }
  }

  if (current.trim()) {
    sentences.push(current.trim());
  }

  return sentences;
}

function splitEnglishLine(line: string): string[] {
  const sentences: string[] = [];
  let current = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    current += char;

    if (ENGLISH_END_PUNCTUATION.includes(char)) {
      if (char === '.' && isAbbreviation(current)) {
        continue;
      }

      if (char === '.' && isNumbering(current)) {
        continue;
      }

      let lookAhead = i + 1;
      while (lookAhead < line.length) {
        const nextChar = line[lookAhead];
        if (nextChar === '"' || nextChar === "'" || nextChar === ')' || nextChar === ']' || nextChar === '}') {
          current += nextChar;
          lookAhead++;
        } else {
          break;
        }
      }

      const trimmed = current.trim();
      if (trimmed) {
        sentences.push(trimmed);
      }
      current = '';
      i = lookAhead - 1;
    }
  }

  if (current.trim()) {
    sentences.push(current.trim());
  }

  return sentences;
}

const NUMBERING_PATTERNS = [
  /^\d+\./,
  /^\d+\)/,
  /^\(\d+\)/,
  /^[IVXLCDM]+\./,
  /^[IVXLCDM]+\)/,
  /^\([IVXLCDM]+\)/,
  /^[A-Z]\./,
  /^[A-Z]\)/,
  /^\([A-Z]\)/,
];

function isAbbreviation(text: string): boolean {
  const trimmed = text.trim();
  for (const abbr of ENGLISH_ABBREVIATIONS) {
    if (trimmed.endsWith(' ' + abbr) || trimmed === abbr) {
      return true;
    }
  }

  const match = trimmed.match(/\b[A-Z]\.$/);
  if (match && match.index !== undefined && match.index > 0) {
    const prevChar = trimmed[match.index - 1];
    if (prevChar === ' ') {
      return true;
    }
  }

  return false;
}

function isNumbering(text: string): boolean {
  const trimmed = text.trim();
  for (const pattern of NUMBERING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  return false;
}
