import React, { useState, useEffect } from 'react';
import type { AlignedSentence } from '../utils/sentenceAligner';

interface AlignmentResultProps {
  data: AlignedSentence[];
  setData: (data: AlignedSentence[]) => void;
  searchTerm: string;
}

interface SplitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSplit: (parts: string[]) => void;
  originalText: string;
  column: 'chinese' | 'english';
}

const SplitDialog: React.FC<SplitDialogProps> = ({
  isOpen,
  onClose,
  onSplit,
  originalText,
  column,
}) => {
  const [text, setText] = useState(originalText);

  useEffect(() => {
    if (isOpen) {
      setText(originalText);
    }
  }, [isOpen, originalText]);

  const handleSplit = () => {
    const parts = text.split('\n').map(p => p.trim()).filter(p => p);
    if (parts.length >= 2) {
      onSplit(parts);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
      <div className="modal-content p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Split {column === 'chinese' ? 'C' : 'E'}
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Enter the text with line breaks to split:
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-32 p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none mb-4"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSplit}
            className="px-4 py-2 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all"
          >
            Split
          </button>
        </div>
      </div>
    </div>
  );
};

export const AlignmentResult: React.FC<AlignmentResultProps> = ({ data, setData, searchTerm }) => {
  const [splitDialog, setSplitDialog] = useState<{
    isOpen: boolean;
    index: number;
    column: 'chinese' | 'english';
  }>({ isOpen: false, index: 0, column: 'chinese' });
  const [validationErrors, setValidationErrors] = useState<number[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; column: 'chinese' | 'english' } | null>(null);

  const handleEdit = (index: number, field: 'chinese' | 'english', value: string) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    setData(newData);
    if (showValidation) {
      validateAlignment(newData);
    }
  };

  const handleAddRowAbove = (index: number) => {
    const newRow: AlignedSentence = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      chinese: '',
      english: '',
    };
    const newData = [...data];
    newData.splice(index, 0, newRow);
    setData(newData);
  };

  const handleAddRowBelow = (index: number) => {
    const newRow: AlignedSentence = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      chinese: '',
      english: '',
    };
    const newData = [...data];
    newData.splice(index + 1, 0, newRow);
    setData(newData);
  };

  const handleDeleteRow = (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
    if (showValidation) {
      validateAlignment(newData);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newData = [...data];
    [newData[index], newData[index - 1]] = [newData[index - 1], newData[index]];
    setData(newData);
  };

  const handleMoveDown = (index: number) => {
    if (index === data.length - 1) return;
    const newData = [...data];
    [newData[index], newData[index + 1]] = [newData[index + 1], newData[index]];
    setData(newData);
  };

  const handleMergeWithPrevious = (index: number) => {
    if (index === 0) return;
    const newData = [...data];
    newData[index - 1] = {
      ...newData[index - 1],
      chinese: newData[index - 1].chinese + ' ' + newData[index].chinese,
      english: newData[index - 1].english + ' ' + newData[index].english,
    };
    newData.splice(index, 1);
    setData(newData);
    if (showValidation) {
      validateAlignment(newData);
    }
  };

  const handleMergeWithNext = (index: number) => {
    if (index === data.length - 1) return;
    const newData = [...data];
    newData[index] = {
      ...newData[index],
      chinese: newData[index].chinese + ' ' + newData[index + 1].chinese,
      english: newData[index].english + ' ' + newData[index + 1].english,
    };
    newData.splice(index + 1, 1);
    setData(newData);
    if (showValidation) {
      validateAlignment(newData);
    }
  };

  const joinSegments = (a: string, b: string, column: 'chinese' | 'english'): string => {
    const filtered = [a.trim(), b.trim()].filter(Boolean);
    if (filtered.length === 0) return '';
    if (column === 'english') {
      return filtered.join(' ');
    } else {
      return filtered.join('');
    }
  };

  const mergeColumnWithShift = (
    rowIndex: number,
    column: 'chinese' | 'english',
    direction: 'up' | 'down'
  ) => {
    const newData = [...data];

    if (direction === 'up') {
      if (rowIndex === 0) return;

      const targetIndex = rowIndex - 1;
      const merged = joinSegments(
        newData[targetIndex][column],
        newData[rowIndex][column],
        column
      );
      newData[targetIndex] = {
        ...newData[targetIndex],
        [column]: merged,
      };

      for (let i = rowIndex; i < newData.length - 1; i++) {
        newData[i] = {
          ...newData[i],
          [column]: newData[i + 1][column],
        };
      }

      newData[newData.length - 1] = {
        ...newData[newData.length - 1],
        [column]: '',
      };
    } else {
      if (rowIndex === newData.length - 1) return;

      const merged = joinSegments(
        newData[rowIndex][column],
        newData[rowIndex + 1][column],
        column
      );
      newData[rowIndex] = {
        ...newData[rowIndex],
        [column]: merged,
      };

      for (let i = rowIndex + 1; i < newData.length - 1; i++) {
        newData[i] = {
          ...newData[i],
          [column]: newData[i + 1][column],
        };
      }

      newData[newData.length - 1] = {
        ...newData[newData.length - 1],
        [column]: '',
      };
    }

    setData(newData);
    if (showValidation) {
      validateAlignment(newData);
    }
  };

  const handleMergeChineseUp = (index: number) => {
    mergeColumnWithShift(index, 'chinese', 'up');
  };

  const handleMergeChineseDown = (index: number) => {
    mergeColumnWithShift(index, 'chinese', 'down');
  };

  const handleMergeEnglishUp = (index: number) => {
    mergeColumnWithShift(index, 'english', 'up');
  };

  const handleMergeEnglishDown = (index: number) => {
    mergeColumnWithShift(index, 'english', 'down');
  };

  const handleSplitChinese = (index: number) => {
    setSplitDialog({ isOpen: true, index, column: 'chinese' });
  };

  const handleSplitEnglish = (index: number) => {
    setSplitDialog({ isOpen: true, index, column: 'english' });
  };

  const splitColumnOnly = (rowIndex: number, column: 'chinese' | 'english', parts: string[]) => {
    const cleanedParts = parts.map(p => p.trim()).filter(Boolean);
    if (cleanedParts.length === 0) {
      setSplitDialog({ isOpen: false, index: 0, column: 'chinese' });
      return;
    }

    const newData = data.map(row => ({ ...row }));

    const oldColumnValues = newData.slice(rowIndex).map(row => row[column]);
    const newColumnValues = [
      ...cleanedParts,
      ...oldColumnValues.slice(1)
    ];

    while (rowIndex + newColumnValues.length > newData.length) {
      newData.push({
        id: `row-${Date.now()}-${newData.length}-${Math.random().toString(36).substr(2, 9)}`,
        chinese: '',
        english: '',
      });
    }

    for (let i = 0; i < newColumnValues.length; i++) {
      newData[rowIndex + i][column] = newColumnValues[i];
    }

    setData(newData);
    setSplitDialog({ isOpen: false, index: 0, column: 'chinese' });
    if (showValidation) {
      validateAlignment(newData);
    }
  };

  const handleSplit = (parts: string[]) => {
    const { index, column } = splitDialog;
    splitColumnOnly(index, column, parts);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all alignment results?')) {
      setData([]);
      setValidationErrors([]);
      setShowValidation(false);
    }
  };

  const handleTrimEmptyRows = () => {
    const newData = data.filter(item => item.chinese.trim() || item.english.trim());
    setData(newData);
    if (showValidation) {
      validateAlignment(newData);
    }
  };

  const validateAlignment = (dataToValidate: AlignedSentence[]) => {
    const errors: number[] = [];
    dataToValidate.forEach((item, index) => {
      if (!item.chinese.trim() || !item.english.trim()) {
        errors.push(index);
      }
    });
    setValidationErrors(errors);
    setShowValidation(true);
  };

  const handleValidateAlignment = () => {
    validateAlignment(data);
  };

  const handleClearValidation = () => {
    setShowValidation(false);
    setValidationErrors([]);
  };

  const isMatch = (item: AlignedSentence): boolean => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase();
    return item.chinese.toLowerCase().includes(term) || item.english.toLowerCase().includes(term);
  };

  if (data.length === 0) {
    return (
      <div className="main-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Alignment Result</h2>
        </div>
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No alignment results yet</p>
          <p className="text-sm mt-2">Enter text and click "Split & Align" to get started</p>
        </div>
      </div>
    );
  }

  const chineseCount = data.filter(d => d.chinese.trim()).length;
  const englishCount = data.filter(d => d.english.trim()).length;
  const isMatched = chineseCount === englishCount;
  const matchCount = data.filter(isMatch).length;

  return (
    <div className="main-card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Alignment Result</h2>
        <div className="flex gap-3">
          <button
            onClick={handleTrimEmptyRows}
            className="btn-secondary"
            title="Remove rows where both Chinese and English are empty"
          >
            Trim Empty Rows
          </button>
          <button
            onClick={handleValidateAlignment}
            className="btn-secondary"
            title="Check for rows with missing Chinese or English content"
          >
            Validate Alignment
          </button>
          <button
            onClick={handleClearAll}
            className="btn-danger"
            title="Clear all alignment results"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <span className={`status-badge ${isMatched ? 'status-badge-success' : 'status-badge-warning'}`}>
          {isMatched ? '✓ Matched' : '⚠ Mismatch Warning'}
        </span>
        <div className="text-gray-600">
          Sentence Count: {chineseCount} Chinese / {englishCount} English
        </div>
        {showValidation && (
          <>
            {validationErrors.length > 0 ? (
              <span className="status-badge status-badge-danger">
                ⚠ {validationErrors.length} row(s) have missing content
              </span>
            ) : (
              <span className="status-badge status-badge-success">
                ✓ All rows have both Chinese and English content
              </span>
            )}
            <button
              onClick={handleClearValidation}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Hide validation
            </button>
          </>
        )}
        {searchTerm && matchCount > 0 && (
          <span className="status-badge status-badge-info">
            🔍 {matchCount} match{matchCount !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      <div className="table-container-wrapper">
        <div className="overflow-x-auto sticky-header-container">
          <table className="w-full border-collapse table-container">
          <thead className="sticky-header">
            <tr>
              <th className="table-header">No.</th>
              <th className="table-header">Chinese</th>
              <th className="table-header">English</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => {
              const hasError = showValidation && validationErrors.includes(index);
              const isMatching = isMatch(item);
              const isEditingChinese = editingCell?.row === index && editingCell?.column === 'chinese';
              const isEditingEnglish = editingCell?.row === index && editingCell?.column === 'english';
              
              return (
                <tr 
                  key={item.id} 
                  className={`table-row ${hasError ? 'table-row-error' : ''} ${isMatching ? 'table-row-match' : ''}`}
                >
                  <td className={`table-cell ${hasError ? 'table-cell-error' : ''} ${isMatching ? 'font-bold' : ''}`}>
                    {index + 1}
                  </td>
                  <td className={`table-cell ${hasError && !item.chinese.trim() ? 'table-cell-error' : ''}`}>
                    <textarea
                      value={item.chinese}
                      onChange={(e) => handleEdit(index, 'chinese', e.target.value)}
                      onFocus={() => setEditingCell({ row: index, column: 'chinese' })}
                      onBlur={() => setEditingCell(null)}
                      className={`alignment-cell ${isEditingChinese ? 'alignment-cell-focus' : ''}`}
                      placeholder="Chinese text..."
                    />
                  </td>
                  <td className={`table-cell ${hasError && !item.english.trim() ? 'table-cell-error' : ''}`}>
                    <textarea
                      value={item.english}
                      onChange={(e) => handleEdit(index, 'english', e.target.value)}
                      onFocus={() => setEditingCell({ row: index, column: 'english' })}
                      onBlur={() => setEditingCell(null)}
                      className={`alignment-cell ${isEditingEnglish ? 'alignment-cell-focus' : ''}`}
                      placeholder="English text..."
                    />
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => handleAddRowAbove(index)}
                        className="action-btn action-btn-gray"
                        title="Add row above"
                      >
                        ↑+
                      </button>
                      <button
                        onClick={() => handleAddRowBelow(index)}
                        className="action-btn action-btn-gray"
                        title="Add row below"
                      >
                        ↓+
                      </button>
                      <button
                        onClick={() => handleDeleteRow(index)}
                        className="action-btn action-btn-danger"
                        title="Delete row"
                      >
                        ✕
                      </button>
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className={`action-btn ${index === 0 ? 'action-btn-disabled' : 'action-btn-blue'}`}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === data.length - 1}
                        className={`action-btn ${index === data.length - 1 ? 'action-btn-disabled' : 'action-btn-blue'}`}
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleMergeWithPrevious(index)}
                        disabled={index === 0}
                        className={`action-btn ${index === 0 ? 'action-btn-disabled' : 'action-btn-purple'}`}
                        title="Merge entire row with previous"
                      >
                        Row ↑
                      </button>
                      <button
                        onClick={() => handleMergeWithNext(index)}
                        disabled={index === data.length - 1}
                        className={`action-btn ${index === data.length - 1 ? 'action-btn-disabled' : 'action-btn-purple'}`}
                        title="Merge entire row with next"
                      >
                        Row ↓
                      </button>
                      <button
                        onClick={() => handleMergeChineseUp(index)}
                        disabled={index === 0}
                        className={`action-btn ${index === 0 ? 'action-btn-disabled' : 'action-btn-cyan'}`}
                        title="Merge Chinese Up"
                      >
                        C↑
                      </button>
                      <button
                        onClick={() => handleMergeChineseDown(index)}
                        disabled={index === data.length - 1}
                        className={`action-btn ${index === data.length - 1 ? 'action-btn-disabled' : 'action-btn-cyan'}`}
                        title="Merge Chinese Down"
                      >
                        C↓
                      </button>
                      <button
                        onClick={() => handleMergeEnglishUp(index)}
                        disabled={index === 0}
                        className={`action-btn ${index === 0 ? 'action-btn-disabled' : 'action-btn-amber'}`}
                        title="Merge English Up"
                      >
                        E↑
                      </button>
                      <button
                        onClick={() => handleMergeEnglishDown(index)}
                        disabled={index === data.length - 1}
                        className={`action-btn ${index === data.length - 1 ? 'action-btn-disabled' : 'action-btn-amber'}`}
                        title="Merge English Down"
                      >
                        E↓
                      </button>
                      <button
                        onClick={() => handleSplitChinese(index)}
                        className="action-btn action-btn-green"
                        title="Split Chinese"
                      >
                        Split C
                      </button>
                      <button
                        onClick={() => handleSplitEnglish(index)}
                        className="action-btn action-btn-green"
                        title="Split English"
                      >
                        Split E
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <SplitDialog
        isOpen={splitDialog.isOpen}
        onClose={() => setSplitDialog({ ...splitDialog, isOpen: false })}
        onSplit={handleSplit}
        originalText={data[splitDialog.index]?.[splitDialog.column] || ''}
        column={splitDialog.column}
      />
    </div>
  );
};
