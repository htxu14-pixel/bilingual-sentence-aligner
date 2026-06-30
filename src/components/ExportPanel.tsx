import React, { useState, useRef } from 'react';
import type { AlignedSentence } from '../utils/sentenceAligner';
import { exportCSV, exportTXT, exportJSON, exportExcel, exportWord, importCSV, importExcel, copyTable, downloadFile, getTimestamp } from '../utils/exportUtils';

interface ExportPanelProps {
  data: AlignedSentence[];
  onImport: (data: AlignedSentence[]) => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ data, onImport }) => {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    const content = exportCSV(data);
    const filename = `bilingual_alignment_${getTimestamp()}.csv`;
    downloadFile(content, filename, 'text/csv');
  };

  const handleExportTXT = () => {
    const content = exportTXT(data);
    const filename = `bilingual_alignment_${getTimestamp()}.txt`;
    downloadFile(content, filename, 'text/plain');
  };

  const handleExportJSON = () => {
    const content = exportJSON(data);
    const filename = `bilingual_alignment_${getTimestamp()}.json`;
    downloadFile(content, filename, 'application/json');
  };

  const handleExportExcel = () => {
    exportExcel(data);
  };

  const handleExportWord = async () => {
    setExporting(true);
    try {
      await exportWord(data);
    } catch (error) {
      console.error('Export Word failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyTable = async () => {
    const content = copyTable(data);
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const result = await importCSV(file);
      onImport(result);
    } catch (error) {
      console.error('Import CSV failed:', error);
      alert('Failed to import CSV file');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const result = await importExcel(file);
      onImport(result);
    } catch (error) {
      console.error('Import Excel failed:', error);
      alert('Failed to import Excel file');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="main-card">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Export & Import</h2>
      
      <div className="export-section">
        <h3 className="section-title">Export</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportCSV}
            disabled={data.length === 0}
            className={`btn-primary ${data.length === 0 ? 'btn-disabled' : ''}`}
          >
            CSV
          </button>
          <button
            onClick={handleExportTXT}
            disabled={data.length === 0}
            className={`btn-primary btn-primary-indigo ${data.length === 0 ? 'btn-disabled' : ''}`}
          >
            TXT
          </button>
          <button
            onClick={handleExportJSON}
            disabled={data.length === 0}
            className={`btn-primary btn-primary-purple ${data.length === 0 ? 'btn-disabled' : ''}`}
          >
            JSON
          </button>
          <button
            onClick={handleExportExcel}
            disabled={data.length === 0}
            className={`btn-primary btn-primary-green ${data.length === 0 ? 'btn-disabled' : ''}`}
          >
            Excel
          </button>
          <button
            onClick={handleExportWord}
            disabled={data.length === 0 || exporting}
            className={`btn-primary ${data.length === 0 || exporting ? 'btn-disabled' : ''}`}
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' }}
          >
            {exporting ? 'Exporting...' : 'Word'}
          </button>
          <button
            onClick={handleCopyTable}
            disabled={data.length === 0}
            className={`btn-secondary ${data.length === 0 ? 'btn-disabled' : ''}`}
          >
            {copied ? '✓ Copied!' : 'Copy Table'}
          </button>
        </div>
      </div>

      <div className="import-section">
        <h3 className="section-title">Import</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => csvInputRef.current?.click()}
            disabled={importing}
            className={`btn-secondary ${importing ? 'btn-disabled' : ''}`}
            style={{ background: 'rgba(251, 235, 205, 0.8)', color: '#92400e' }}
          >
            {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <button
            onClick={() => excelInputRef.current?.click()}
            disabled={importing}
            className={`btn-secondary ${importing ? 'btn-disabled' : ''}`}
            style={{ background: 'rgba(251, 235, 205, 0.8)', color: '#92400e' }}
          >
            {importing ? 'Importing...' : 'Import Excel'}
          </button>
        </div>
      </div>
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv"
        onChange={handleImportCSV}
        className="hidden"
      />
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleImportExcel}
        className="hidden"
      />
    </div>
  );
};
