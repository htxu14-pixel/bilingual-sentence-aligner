import { useState, useEffect, useMemo, useCallback } from 'react';
import { InputArea } from './components/InputArea';
import { AlignmentResult } from './components/AlignmentResult';
import { ExportPanel } from './components/ExportPanel';
import { SearchBar } from './components/SearchBar';
import { alignSentences } from './utils/sentenceAligner';
import { splitIntoSentences } from './utils/sentenceSplitter';
import { detectLanguage } from './utils/languageDetector';
import './index.css';

interface DraftData {
  inputMode: 'separate' | 'mixed' | 'file' | 'imported';
  chineseText: string;
  englishText: string;
  mixedText: string;
  alignedData: ReturnType<typeof alignSentences>;
}

const STORAGE_KEY = 'bilingual-aligner-draft';

function App() {
  const [inputMode, setInputMode] = useState<'separate' | 'mixed' | 'file' | 'imported'>('separate');
  const [chineseText, setChineseText] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [mixedText, setMixedText] = useState('');
  const [alignedData, setAlignedData] = useState<ReturnType<typeof alignSentences>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const counts = useMemo(() => {
    let chineseCount = 0;
    let englishCount = 0;

    if (inputMode === 'separate' || inputMode === 'file') {
      chineseCount = splitIntoSentences(chineseText, 'Chinese').length;
      englishCount = splitIntoSentences(englishText, 'English').length;
      
      if (inputMode === 'file' && chineseCount === 0 && englishCount === 0) {
        const lines = mixedText.split(/\r?\n/);
        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;
          const lang = detectLanguage(trimmedLine);
          if (lang === 'Chinese') {
            chineseCount += splitIntoSentences(trimmedLine, 'Chinese').length;
          } else if (lang === 'English') {
            englishCount += splitIntoSentences(trimmedLine, 'English').length;
          }
        });
      }
    } else if (inputMode === 'mixed') {
      const lines = mixedText.split(/\r?\n/);
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;
        const lang = detectLanguage(trimmedLine);
        if (lang === 'Chinese') {
          chineseCount += splitIntoSentences(trimmedLine, 'Chinese').length;
        } else if (lang === 'English') {
          englishCount += splitIntoSentences(trimmedLine, 'English').length;
        }
      });
    } else if (inputMode === 'imported') {
      chineseCount = alignedData.filter(d => d.chinese.trim()).length;
      englishCount = alignedData.filter(d => d.english.trim()).length;
    }

    return { chineseCount, englishCount };
  }, [inputMode, chineseText, englishText, mixedText, alignedData]);

  useEffect(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft: DraftData = JSON.parse(savedDraft);
        setInputMode(draft.inputMode);
        setChineseText(draft.chineseText);
        setEnglishText(draft.englishText);
        setMixedText(draft.mixedText);
        setAlignedData(draft.alignedData);
      } catch {
        console.error('Failed to parse saved draft');
      }
    }
  }, []);

  useEffect(() => {
    const draft: DraftData = {
      inputMode,
      chineseText,
      englishText,
      mixedText,
      alignedData,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setHasChanges(true);
  }, [inputMode, chineseText, englishText, mixedText, alignedData]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges && alignedData.length > 0) {
        e.preventDefault();
        e.returnValue = '';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges, alignedData.length]);

  const handleAlign = (data: ReturnType<typeof alignSentences>) => {
    setAlignedData(data);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all input and alignment results?')) {
      setChineseText('');
      setEnglishText('');
      setMixedText('');
      setAlignedData([]);
      setInputMode('separate');
    }
  };

  const handleImport = (data: ReturnType<typeof alignSentences>) => {
    setAlignedData(data);
    setInputMode('imported');
  };

  

  const handleGoToRow = useCallback((rowNumber: number) => {
    const rowIndex = rowNumber - 1;
    const tableBody = document.querySelector('table tbody');
    if (tableBody) {
      const rows = tableBody.querySelectorAll('tr');
      const targetRow = rows[rowIndex];
      if (targetRow) {
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetRow.classList.add('highlight-row');
        setTimeout(() => targetRow.classList.remove('highlight-row'), 2000);
      }
    }
  }, []);

  const matchCount = useMemo(() => {
    if (!searchTerm) return 0;
    const term = searchTerm.toLowerCase();
    return alignedData.filter(item => 
      item.chinese.toLowerCase().includes(term) || item.english.toLowerCase().includes(term)
    ).length;
  }, [searchTerm, alignedData]);

  return (
    <div className="page-container flex flex-col">
      <header className="header-gold">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="logo-mark">
              <span>BSA</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Bilingual Sentence Aligner</h1>
              <p className="text-sm text-gray-500">Chinese-English Sentence Splitting, Alignment & Corpus Editing</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="space-y-6">
          <InputArea
            inputMode={inputMode === 'imported' ? 'separate' : inputMode}
            setInputMode={setInputMode}
            chineseText={chineseText}
            setChineseText={setChineseText}
            englishText={englishText}
            setEnglishText={setEnglishText}
            mixedText={mixedText}
            setMixedText={setMixedText}
            onAlign={handleAlign}
            onClearAll={handleClearAll}
            chineseCount={counts.chineseCount}
            englishCount={counts.englishCount}
          />

          {alignedData.length > 0 && (
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              matchCount={matchCount}
              onGoToRow={handleGoToRow}
              totalRows={alignedData.length}
            />
          )}

          <AlignmentResult
            data={alignedData}
            setData={setAlignedData}
            searchTerm={searchTerm}
          />

          <ExportPanel
            data={alignedData}
            onImport={handleImport}
          />
        </div>
      </main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            Bilingual Sentence Aligner - All processing done locally in your browser
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
