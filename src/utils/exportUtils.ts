import type { AlignedSentence } from './sentenceAligner';
import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
} from 'docx';
import { saveAs } from 'file-saver';

export function exportCSV(data: AlignedSentence[]): string {
  const BOM = '\uFEFF';
  let csv = BOM + 'No.,Chinese,English\n';
  data.forEach((item, index) => {
    const chinese = escapeCSV(item.chinese);
    const english = escapeCSV(item.english);
    csv += `${index + 1},${chinese},${english}\n`;
  });
  return csv;
}

export function exportTXT(data: AlignedSentence[]): string {
  let txt = '';
  data.forEach(item => {
    txt += `${item.chinese}\t${item.english}\n`;
  });
  return txt;
}

export function exportJSON(data: AlignedSentence[]): string {
  const jsonData = data.map((item, index) => ({
    no: index + 1,
    chinese: item.chinese,
    english: item.english,
  }));
  return JSON.stringify(jsonData, null, 2);
}

export function copyTable(data: AlignedSentence[]): string {
  let text = '';
  data.forEach((item, index) => {
    text += `${index + 1}\t${item.chinese}\t${item.english}\n`;
  });
  return text;
}

export function exportExcel(data: AlignedSentence[]): void {
  const aoaData: (string | number)[][] = [
    ['No.', 'Chinese', 'English'],
  ];

  data.forEach((item, index) => {
    aoaData.push([index + 1, item.chinese, item.english]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Alignment');

  const filename = `bilingual_alignment_${getTimestamp()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export async function exportWord(data: AlignedSentence[]): Promise<void> {
  const tableRows: TableRow[] = [];

  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'No.',
                  bold: true,
                  font: 'Times New Roman',
                  size: 24,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: 'Chinese',
                  bold: true,
                  font: 'Microsoft YaHei',
                  size: 24,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: 'English',
                  bold: true,
                  font: 'Times New Roman',
                  size: 24,
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  data.forEach((item, index) => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: String(index + 1),
                    font: 'Times New Roman',
                    size: 22,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: item.chinese || '',
                    font: 'Microsoft YaHei',
                    size: 22,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: item.english || '',
                    font: 'Times New Roman',
                    size: 22,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 400 },
            children: [
              new TextRun({
                text: 'Bilingual Sentence Alignment',
                bold: true,
                font: 'Microsoft YaHei',
                size: 32,
              }),
            ],
          }),
          table,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `bilingual_alignment_${getTimestamp()}.docx`;
  saveAs(blob, filename);
}

export function importCSV(file: File): Promise<AlignedSentence[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let content = event.target?.result as string;
        if (content.startsWith('\uFEFF')) {
          content = content.substring(1);
        }

        const lines = content.split(/\r?\n/).filter(line => line.trim());
        const result: AlignedSentence[] = [];

        if (lines.length === 0) {
          resolve(result);
          return;
        }

        const firstLine = lines[0];
        const hasNoColumn = firstLine.toLowerCase().includes('no.') || 
                            firstLine.toLowerCase().includes('no') ||
                            firstLine.toLowerCase().includes('#');

        let startIndex = 0;
        let chineseIndex = 0;
        let englishIndex = 1;

        if (hasNoColumn) {
          startIndex = 1;
          const headers = firstLine.split(',').map(h => h.trim().toLowerCase());
          const noIndex = headers.findIndex(h => h.includes('no') || h.includes('#'));
          chineseIndex = headers.findIndex(h => h.includes('chinese'));
          englishIndex = headers.findIndex(h => h.includes('english'));

          if (chineseIndex === -1) chineseIndex = noIndex + 1;
          if (englishIndex === -1) englishIndex = noIndex + 2;
        } else {
          const headers = firstLine.split(',').map(h => h.trim().toLowerCase());
          if (headers.length >= 2) {
            const hasChineseHeader = headers.some(h => h.includes('chinese'));
            const hasEnglishHeader = headers.some(h => h.includes('english'));
            
            if (hasChineseHeader && hasEnglishHeader) {
              startIndex = 1;
              chineseIndex = headers.findIndex(h => h.includes('chinese'));
              englishIndex = headers.findIndex(h => h.includes('english'));
            } else {
              startIndex = 0;
              chineseIndex = 0;
              englishIndex = 1;
            }
          } else {
            startIndex = 0;
            chineseIndex = 0;
            englishIndex = 1;
          }
        }

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          const parts = parseCSVLine(line);
          
          const chinese = parts[chineseIndex] || '';
          const english = parts[englishIndex] || '';

          if (chinese.trim() || english.trim()) {
            result.push({
              id: `row-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
              chinese: chinese.trim(),
              english: english.trim(),
            });
          }
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

export function importExcel(file: File): Promise<AlignedSentence[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const aoaData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

        const result: AlignedSentence[] = [];

        if (aoaData.length === 0) {
          resolve(result);
          return;
        }

        const firstRow = aoaData[0];
        const firstRowStr = firstRow.map(cell => String(cell).toLowerCase()).join(' ');
        const hasNoColumn = firstRowStr.includes('no') || firstRowStr.includes('#');

        let startIndex = 0;
        let chineseIndex = 0;
        let englishIndex = 1;

        if (hasNoColumn) {
          startIndex = 1;
          const headers = firstRow.map(cell => String(cell).toLowerCase().trim());
          const noIndex = headers.findIndex(h => h.includes('no') || h.includes('#'));
          chineseIndex = headers.findIndex(h => h.includes('chinese'));
          englishIndex = headers.findIndex(h => h.includes('english'));

          if (chineseIndex === -1) chineseIndex = noIndex + 1;
          if (englishIndex === -1) englishIndex = noIndex + 2;
        } else {
          const headers = firstRow.map(cell => String(cell).toLowerCase().trim());
          const hasChineseHeader = headers.some(h => h.includes('chinese'));
          const hasEnglishHeader = headers.some(h => h.includes('english'));
          
          if (hasChineseHeader && hasEnglishHeader) {
            startIndex = 1;
            chineseIndex = headers.findIndex(h => h.includes('chinese'));
            englishIndex = headers.findIndex(h => h.includes('english'));
          } else {
            startIndex = 0;
            chineseIndex = 0;
            englishIndex = 1;
          }
        }

        for (let i = startIndex; i < aoaData.length; i++) {
          const row = aoaData[i];
          const chinese = String(row[chineseIndex] || '');
          const english = String(row[englishIndex] || '');

          if (chinese.trim() || english.trim()) {
            result.push({
              id: `row-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
              chinese: chinese.trim(),
              english: english.trim(),
            });
          }
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

function escapeCSV(text: string): string {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}`;
}
