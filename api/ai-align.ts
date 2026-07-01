import { OpenAI } from 'openai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const MODEL = process.env.AI_MODEL || 'deepseek-chat';

interface AlignmentRow {
  chinese: string;
  english: string;
  chineseIndexes: number[];
  englishIndexes: number[];
}

function extractJsonArray(text: string): string {
  let cleaned = text.trim();
  
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/, '');
  cleaned = cleaned.replace(/\s*```$/, '');
  
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return cleaned.substring(firstBracket, lastBracket + 1);
  }
  
  return cleaned;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chineseSegments, englishSegments } = req.body as {
    chineseSegments: string[];
    englishSegments: string[];
  };

  if (!chineseSegments || !englishSegments) {
    return res.status(400).json({ error: 'Missing segments' });
  }

  const totalSegments = chineseSegments.length + englishSegments.length;
  if (totalSegments > 120) {
    return res.status(400).json({
      error: 'Too many segments for one AI alignment. Please split the text into smaller parts.'
    });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing DEEPSEEK_API_KEY' });
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/v1'
    });

    const chineseText = chineseSegments
      .map((seg, idx) => `${idx + 1}. ${seg}`)
      .join('\n');

    const englishText = englishSegments
      .map((seg, idx) => `${idx + 1}. ${seg}`)
      .join('\n');

    const systemPrompt = `You are a bilingual corpus alignment assistant.
Your task is to align Chinese and English segments semantically.
Do not translate.
Do not rewrite.
Do not summarize.
Do not delete any segment.
Do not invent any content.
Only merge or group the provided segments when necessary.

Return valid JSON only.

The JSON format must be:
[
  {
    "chinese": "original Chinese segment(s)",
    "english": "original English segment(s)",
    "chineseIndexes": [1, 2],
    "englishIndexes": [1, 2]
  }
]

Rules:
- Preserve the original wording exactly.
- Every Chinese segment must appear once and only once.
- Every English segment must appear once and only once.
- One Chinese segment may align with multiple English segments.
- Multiple Chinese segments may align with one English segment.
- If there is no corresponding segment, leave the other side empty.
- Return JSON only, no markdown, no explanation.`;

    const userContent = `Chinese segments:
${chineseText}

English segments:
${englishText}`;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('AI alignment error: Invalid API response, content is empty');
      return res.status(500).json({ error: 'Invalid API response' });
    }

    const extractedJson = extractJsonArray(content);

    let alignmentResult: AlignmentRow[];
    try {
      alignmentResult = JSON.parse(extractedJson);
    } catch {
      const rawPreview = content.substring(0, 500);
      console.error('AI alignment error: Failed to parse AI alignment result', { raw: rawPreview });
      return res.status(500).json({ 
        error: 'Failed to parse AI alignment result',
        raw: rawPreview
      });
    }

    if (!Array.isArray(alignmentResult)) {
      const rawPreview = content.substring(0, 500);
      console.error('AI alignment error: AI response is not an array', { raw: rawPreview });
      return res.status(500).json({ 
        error: 'Failed to parse AI alignment result',
        raw: rawPreview
      });
    }

    const usedChineseIndexes = new Set<number>();
    const usedEnglishIndexes = new Set<number>();

    for (const row of alignmentResult) {
      if (row.chineseIndexes) {
        row.chineseIndexes.forEach(idx => usedChineseIndexes.add(idx));
      }
      if (row.englishIndexes) {
        row.englishIndexes.forEach(idx => usedEnglishIndexes.add(idx));
      }
    }

    for (let i = 1; i <= chineseSegments.length; i++) {
      if (!usedChineseIndexes.has(i)) {
        alignmentResult.push({
          chinese: chineseSegments[i - 1],
          english: '',
          chineseIndexes: [i],
          englishIndexes: []
        });
      }
    }

    for (let i = 1; i <= englishSegments.length; i++) {
      if (!usedEnglishIndexes.has(i)) {
        alignmentResult.push({
          chinese: '',
          english: englishSegments[i - 1],
          chineseIndexes: [],
          englishIndexes: [i]
        });
      }
    }

    const rows = alignmentResult.map((row, idx) => ({
      id: `ai-align-row-${Date.now()}-${idx}`,
      chinese: row.chinese,
      english: row.english,
      chineseIndexes: row.chineseIndexes,
      englishIndexes: row.englishIndexes
    }));

    return res.status(200).json({ rows });

  } catch (error) {
    console.error('AI alignment error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return res.status(401).json({ 
        error: 'Invalid DeepSeek API key. Please check DEEPSEEK_API_KEY in Vercel.' 
      });
    }
    
    if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      return res.status(429).json({ 
        error: 'DeepSeek rate limit or quota exceeded. Please check billing/quota or try again later.' 
      });
    }
    
    return res.status(500).json({ error: 'AI alignment failed. Please try again.' });
  }
}
