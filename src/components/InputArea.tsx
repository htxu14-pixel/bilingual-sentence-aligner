import React, { useRef, useState } from 'react';
import { detectLanguage } from '../utils/languageDetector';
import { splitIntoSentences } from '../utils/sentenceSplitter';
import { alignSentences } from '../utils/sentenceAligner';

interface InputAreaProps {
  inputMode: 'separate' | 'mixed' | 'file' | 'imported';
  setInputMode: (mode: 'separate' | 'mixed' | 'file' | 'imported') => void;
  chineseText: string;
  setChineseText: (text: string) => void;
  englishText: string;
  setEnglishText: (text: string) => void;
  mixedText: string;
  setMixedText: (text: string) => void;
  onAlign: (data: ReturnType<typeof alignSentences>) => void;
  onClearAll: () => void;
  chineseCount: number;
  englishCount: number;
}

type UploadMode = 'separateFiles' | 'mixedFile';

interface FileInfo {
  name: string;
  charCount: number;
  preview: string;
  encoding: string;
}

type EncodingOption = 'auto' | 'utf-8' | 'gb18030' | 'gbk' | 'utf-16le' | 'utf-16be';

const ENCODING_LABELS: Record<EncodingOption, string> = {
  'auto': 'Auto',
  'utf-8': 'UTF-8',
  'gb18030': 'GB18030 / GBK',
  'gbk': 'GBK',
  'utf-16le': 'UTF-16LE',
  'utf-16be': 'UTF-16BE',
};

const SAMPLE_CHINESE = `发展电动汽车
应对气候变化
各位来宾、各位同事，大家上午好！
发展电动汽车顺应了全球绿色低碳转型的大趋势。
中国将继续推动新能源汽车产业高质量发展。`;

const SAMPLE_ENGLISH = `Developing Electric Vehicles
Addressing Climate Change
Distinguished guests and colleagues, good morning.
The development of electric vehicles is in line with the global trend toward green and low-carbon transition.
China will continue to promote the high-quality development of the new energy vehicle industry.`;

const removeBOM = (content: string): string => {
  if (content.startsWith('\uFEFF')) {
    return content.substring(1);
  }
  return content;
};

function scoreDecodedText(text: string): number {
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  const chineseCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\u2ceb0-\u2ebe0]/g) || []).length;
  const asciiCount = (text.match(/[A-Za-z0-9]/g) || []).length;
  const controlCount = (text.match(/[\x00-\x08\x0E-\x1F]/g) || []).length;
  const newlineCount = (text.match(/[\r\n]/g) || []).length;
  const textLength = text.length;

  let score = 0;
  
  score += chineseCount * 3;
  score += asciiCount * 0.2;
  score -= replacementCount * 50;
  score -= controlCount * 20;
  score += newlineCount * 2;
  
  if (textLength > 0) {
    const chineseRatio = chineseCount / textLength;
    if (chineseRatio > 0.1) {
      score += chineseRatio * 100;
    }
  }
  
  return score;
}

function decodeTextFile(arrayBuffer: ArrayBuffer, preferredEncoding?: EncodingOption): { text: string; encoding: string } {
  const bytes = new Uint8Array(arrayBuffer);
  
  const checkBOM = (): string | null => {
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return 'utf-8';
    }
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return 'utf-16le';
    }
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return 'utf-16be';
    }
    return null;
  };
  
  const bomEncoding = checkBOM();
  if (bomEncoding) {
    try {
      const decoder = new TextDecoder(bomEncoding);
      return {
        text: removeBOM(decoder.decode(arrayBuffer)),
        encoding: bomEncoding.toUpperCase()
      };
    } catch {
    }
  }
  
  if (preferredEncoding && preferredEncoding !== 'auto') {
    try {
      const decoder = new TextDecoder(preferredEncoding);
      return {
        text: removeBOM(decoder.decode(arrayBuffer)),
        encoding: preferredEncoding.toUpperCase()
      };
    } catch {
    }
  }
  
  const encodings = ['utf-8', 'gb18030', 'gbk', 'utf-16le', 'utf-16be'];
  let bestResult: { text: string; encoding: string; score: number } | null = null;
  
  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: false });
      const text = removeBOM(decoder.decode(arrayBuffer));
      const score = scoreDecodedText(text);
      
      if (!bestResult || score > bestResult.score) {
        bestResult = { text, encoding, score };
      }
    } catch {
      continue;
    }
  }
  
  if (bestResult) {
    return {
      text: bestResult.text,
      encoding: bestResult.encoding.toUpperCase()
    };
  }
  
  return {
    text: '',
    encoding: 'Unknown'
  };
}

const getFilePreview = (content: string): string => {
  return content;
};

export const InputArea: React.FC<InputAreaProps> = ({
  inputMode,
  setInputMode,
  chineseText,
  setChineseText,
  englishText,
  setEnglishText,
  mixedText,
  setMixedText,
  onAlign,
  onClearAll,
  chineseCount,
  englishCount,
}) => {
  const [uploadMode, setUploadMode] = useState<UploadMode>('separateFiles');
  const [chineseFileInfo, setChineseFileInfo] = useState<FileInfo | null>(null);
  const [englishFileInfo, setEnglishFileInfo] = useState<FileInfo | null>(null);
  const [mixedFileInfo, setMixedFileInfo] = useState<FileInfo | null>(null);
  
  const [chineseEncoding, setChineseEncoding] = useState<EncodingOption>('auto');
  const [englishEncoding, setEnglishEncoding] = useState<EncodingOption>('auto');
  const [mixedEncoding, setMixedEncoding] = useState<EncodingOption>('auto');

  const chineseFileRef = useRef<HTMLInputElement>(null);
  const englishFileRef = useRef<HTMLInputElement>(null);
  const mixedFileRef = useRef<HTMLInputElement>(null);

  const handleClearDraft = () => {
    if (window.confirm('Are you sure you want to clear the saved draft? Your current data will not be affected.')) {
      localStorage.removeItem('bilingual-aligner-draft');
    }
  };

  const handleChineseFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const { text, encoding } = decodeTextFile(event.target?.result as ArrayBuffer, chineseEncoding);
        setChineseText(text);
        setChineseFileInfo({
          name: file.name,
          charCount: text.length,
          preview: getFilePreview(text),
          encoding,
        });
      };
      reader.readAsArrayBuffer(file);
    }
    e.target.value = '';
  };

  const handleEnglishFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const { text, encoding } = decodeTextFile(event.target?.result as ArrayBuffer, englishEncoding);
        setEnglishText(text);
        setEnglishFileInfo({
          name: file.name,
          charCount: text.length,
          preview: getFilePreview(text),
          encoding,
        });
      };
      reader.readAsArrayBuffer(file);
    }
    e.target.value = '';
  };

  const handleMixedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const { text, encoding } = decodeTextFile(event.target?.result as ArrayBuffer, mixedEncoding);
        setMixedText(text);
        setMixedFileInfo({
          name: file.name,
          charCount: text.length,
          preview: getFilePreview(text),
          encoding,
        });
      };
      reader.readAsArrayBuffer(file);
    }
    e.target.value = '';
  };

  const handleSplitAndAlign = () => {
    let chineseSentences: string[] = [];
    let englishSentences: string[] = [];

    if (inputMode === 'separate') {
      chineseSentences = splitIntoSentences(chineseText, 'Chinese');
      englishSentences = splitIntoSentences(englishText, 'English');
    } else if (inputMode === 'mixed') {
      const lines = mixedText.split(/\r?\n/);
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;
        const lang = detectLanguage(trimmedLine);
        if (lang === 'Chinese') {
          chineseSentences.push(...splitIntoSentences(trimmedLine, 'Chinese'));
        } else if (lang === 'English') {
          englishSentences.push(...splitIntoSentences(trimmedLine, 'English'));
        }
      });
    } else if (inputMode === 'file') {
      if (uploadMode === 'separateFiles') {
        chineseSentences = splitIntoSentences(chineseText, 'Chinese');
        englishSentences = splitIntoSentences(englishText, 'English');
      } else if (uploadMode === 'mixedFile') {
        const lines = mixedText.split(/\r?\n/);
        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;
          const lang = detectLanguage(trimmedLine);
          if (lang === 'Chinese') {
            chineseSentences.push(...splitIntoSentences(trimmedLine, 'Chinese'));
          } else if (lang === 'English') {
            englishSentences.push(...splitIntoSentences(trimmedLine, 'English'));
          }
        });
      }
    }

    const aligned = alignSentences(chineseSentences, englishSentences);
    onAlign(aligned);
  };

  const handleLoadSample = () => {
    setChineseText(SAMPLE_CHINESE);
    setEnglishText(SAMPLE_ENGLISH);
    setChineseFileInfo(null);
    setEnglishFileInfo(null);
    setMixedFileInfo(null);
    setInputMode('separate');
  };

  const handleClearFiles = () => {
    setChineseFileInfo(null);
    setEnglishFileInfo(null);
    setMixedFileInfo(null);
    setChineseEncoding('auto');
    setEnglishEncoding('auto');
    setMixedEncoding('auto');
  };

  const isMatched = chineseCount === englishCount;

  const canSplitAndAlign = () => {
    if (inputMode === 'separate') {
      return chineseText.trim().length > 0 || englishText.trim().length > 0;
    }
    if (inputMode === 'mixed') {
      return mixedText.trim().length > 0;
    }
    if (inputMode === 'file') {
      if (uploadMode === 'separateFiles') {
        return chineseText.trim().length > 0 || englishText.trim().length > 0;
      }
      if (uploadMode === 'mixedFile') {
        return mixedText.trim().length > 0;
      }
    }
    return false;
  };

  return (
    <div className="main-card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Input</h2>
        <div className="flex gap-3">
          <button
            onClick={handleClearDraft}
            className="btn-secondary"
            title="Clear Saved Draft"
          >
            Clear Draft
          </button>
          <button
            onClick={handleLoadSample}
            className="btn-secondary"
          >
            Load Sample
          </button>
          <button
            onClick={onClearAll}
            className="btn-danger"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="mode-tabs">
        <button
          onClick={() => {
            setInputMode('separate');
            handleClearFiles();
          }}
          className={`mode-tab ${inputMode === 'separate' ? 'mode-tab-active' : ''}`}
        >
          A. Separate Input
        </button>
        <button
          onClick={() => {
            setInputMode('mixed');
            handleClearFiles();
          }}
          className={`mode-tab ${inputMode === 'mixed' ? 'mode-tab-active' : ''}`}
        >
          B. Mixed Input
        </button>
        <button
          onClick={() => setInputMode('file')}
          className={`mode-tab ${inputMode === 'file' ? 'mode-tab-active' : ''}`}
        >
          C. File Upload
        </button>
      </div>

      {inputMode === 'separate' && (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chinese</label>
            <textarea
              value={chineseText}
              onChange={(e) => setChineseText(e.target.value)}
              placeholder="Enter Chinese text here..."
              className="input-textarea"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">English</label>
            <textarea
              value={englishText}
              onChange={(e) => setEnglishText(e.target.value)}
              placeholder="Enter English text here..."
              className="input-textarea"
            />
          </div>
        </div>
      )}

      {inputMode === 'mixed' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Mixed Text</label>
          <textarea
            value={mixedText}
            onChange={(e) => setMixedText(e.target.value)}
            placeholder="Enter mixed Chinese and English text here..."
            className="input-textarea input-textarea-large"
          />
        </div>
      )}

      {inputMode === 'file' && (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">File Upload Mode</label>
            <div className="sub-mode-tabs">
              <button
                onClick={() => setUploadMode('separateFiles')}
                className={`sub-mode-tab ${uploadMode === 'separateFiles' ? 'sub-mode-tab-active' : ''}`}
              >
                Separate Files
              </button>
              <button
                onClick={() => setUploadMode('mixedFile')}
                className={`sub-mode-tab ${uploadMode === 'mixedFile' ? 'sub-mode-tab-active' : ''}`}
              >
                Mixed File
              </button>
            </div>
          </div>

          {uploadMode === 'separateFiles' && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Chinese File</label>
                  <select
                    value={chineseEncoding}
                    onChange={(e) => setChineseEncoding(e.target.value as EncodingOption)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {(Object.keys(ENCODING_LABELS) as EncodingOption[]).map((key) => (
                      <option key={key} value={key}>
                        {ENCODING_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  ref={chineseFileRef}
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleChineseFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => chineseFileRef.current?.click()}
                  className="upload-box"
                >
                  <span className="text-xl">📄</span>
                  Choose Chinese TXT File
                </button>
                {chineseFileInfo && (
                  <div className="file-info-card">
                    <div className="file-info-header">
                      <span className="file-name">{chineseFileInfo.name}</span>
                      <span className="file-char-count">{chineseFileInfo.charCount} characters</span>
                    </div>
                    <div className="file-info-meta">
                      <span className="file-encoding">Encoding: {chineseFileInfo.encoding}</span>
                    </div>
                    <div className="file-preview-text">
                      {chineseFileInfo.preview}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">English File</label>
                  <select
                    value={englishEncoding}
                    onChange={(e) => setEnglishEncoding(e.target.value as EncodingOption)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {(Object.keys(ENCODING_LABELS) as EncodingOption[]).map((key) => (
                      <option key={key} value={key}>
                        {ENCODING_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  ref={englishFileRef}
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleEnglishFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => englishFileRef.current?.click()}
                  className="upload-box"
                >
                  <span className="text-xl">📄</span>
                  Choose English TXT File
                </button>
                {englishFileInfo && (
                  <div className="file-info-card">
                    <div className="file-info-header">
                      <span className="file-name">{englishFileInfo.name}</span>
                      <span className="file-char-count">{englishFileInfo.charCount} characters</span>
                    </div>
                    <div className="file-info-meta">
                      <span className="file-encoding">Encoding: {englishFileInfo.encoding}</span>
                    </div>
                    <div className="file-preview-text">
                      {englishFileInfo.preview}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {uploadMode === 'mixedFile' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Mixed Bilingual File</label>
                <select
                  value={mixedEncoding}
                  onChange={(e) => setMixedEncoding(e.target.value as EncodingOption)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {(Object.keys(ENCODING_LABELS) as EncodingOption[]).map((key) => (
                    <option key={key} value={key}>
                      {ENCODING_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <input
                ref={mixedFileRef}
                type="file"
                accept=".txt,.csv"
                onChange={handleMixedFileUpload}
                className="hidden"
              />
              <button
                onClick={() => mixedFileRef.current?.click()}
                className="upload-box"
              >
                <span className="text-xl">📄</span>
                Choose Mixed TXT File
              </button>
              {mixedFileInfo && (
                <div className="file-info-card">
                  <div className="file-info-header">
                    <span className="file-name">{mixedFileInfo.name}</span>
                    <span className="file-char-count">{mixedFileInfo.charCount} characters</span>
                  </div>
                  <div className="file-info-meta">
                    <span className="file-encoding">Encoding: {mixedFileInfo.encoding}</span>
                  </div>
                  <div className="file-preview-text">
                    {mixedFileInfo.preview}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-3">
          <span className="status-badge status-badge-info">
            Chinese {chineseCount}
          </span>
          <span className="status-badge status-badge-info">
            English {englishCount}
          </span>
          <span className={`status-badge ${isMatched ? 'status-badge-success' : 'status-badge-warning'}`}>
            {isMatched ? 'Matched' : 'Mismatched'}
          </span>
        </div>
        <button
          onClick={handleSplitAndAlign}
          disabled={!canSplitAndAlign()}
          className={`btn-primary ${!canSplitAndAlign() ? 'btn-disabled' : ''}`}
        >
          Split & Align
        </button>
      </div>
    </div>
  );
};