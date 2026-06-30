import React from 'react';

interface StatusBarProps {
  mode: 'separate' | 'mixed' | 'file' | 'imported';
  rowCount: number;
  hasUnsavedChanges: boolean;
  onClearDraft: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  mode,
  rowCount,
  hasUnsavedChanges,
  onClearDraft,
}) => {
  const modeLabels: Record<StatusBarProps['mode'], string> = {
    separate: 'Separate',
    mixed: 'Mixed',
    file: 'File',
    imported: 'Imported',
  };

  const modeColors: Record<StatusBarProps['mode'], string> = {
    separate: 'bg-blue-100 text-blue-700',
    mixed: 'bg-purple-100 text-purple-700',
    file: 'bg-orange-100 text-orange-700',
    imported: 'bg-green-100 text-green-700',
  };

  return (
    <div className="bg-gray-800 text-gray-300 text-sm py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Mode:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${modeColors[mode]}`}>
              {modeLabels[mode]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Rows:</span>
            <span className="font-medium text-white">{rowCount}</span>
          </div>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">●</span>
              <span className="text-yellow-400">Unsaved changes</span>
            </div>
          )}
        </div>
        <button
          onClick={onClearDraft}
          className="text-gray-400 hover:text-white transition-colors px-3 py-1 rounded hover:bg-gray-700"
          title="Clear saved draft"
        >
          Clear Saved Draft
        </button>
      </div>
    </div>
  );
};
