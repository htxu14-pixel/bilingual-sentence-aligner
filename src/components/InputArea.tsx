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
}

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
        const content = removeBOM(event.target?.result as string);
        setChineseText(content);
        setChineseFileInfo({
          name: file.name,
          charCount: content.length,
          preview: getFilePreview(content),
        });
      };
      reader.readAsText(file, 'UTF-8');
    }
    e.target.value = '';
  };

  const handleEnglishFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = removeBOM(event.target?.result as string);
        setEnglishText(content);
        setEnglishFileInfo({
          name: file.name,
          charCount: content.length,
          preview: getFilePreview(content),
        });
      };
      reader.readAsText(file, 'UTF-8');
    }
    e.target.value = '';
  };

  const handleMixedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = removeBOM(event.target?.result as string);
        setMixedText(content);
        setMixedFileInfo({
          name: file.name,
          charCount: content.length,
          preview: getFilePreview(content),
        });
      };
      reader.readAsText(file, 'UTF-8');
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Chinese File</label>
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
                    <div className="file-preview-text">
                      {chineseFileInfo.preview}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">English File</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Mixed Bilingual File</label>
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