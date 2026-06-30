import React, { useState } from 'react';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  matchCount: number;
  onGoToRow: (row: number) => void;
  totalRows: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  matchCount,
  onGoToRow,
  totalRows,
}) => {
  const [goToRowValue, setGoToRowValue] = useState('');

  const handleGoToRow = () => {
    const row = parseInt(goToRowValue, 10);
    if (row && row > 0 && row <= totalRows) {
      onGoToRow(row);
      setGoToRowValue('');
    }
  };

  const handleGoToRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGoToRow();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search Chinese or English..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          {searchTerm && (
            <span className="text-xs text-gray-500 mt-1 block">
              {matchCount} match{matchCount !== 1 ? 'es' : ''} found
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Go to row:</span>
          <input
            type="number"
            value={goToRowValue}
            onChange={(e) => setGoToRowValue(e.target.value)}
            onKeyDown={handleGoToRowKeyDown}
            placeholder="1"
            min="1"
            max={totalRows}
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          />
          <button
            onClick={handleGoToRow}
            disabled={!goToRowValue || totalRows === 0}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              goToRowValue && totalRows > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-500 cursor-not-allowed'
            }`}
          >
            Go
          </button>
        </div>
      </div>
    </div>
  );
};
