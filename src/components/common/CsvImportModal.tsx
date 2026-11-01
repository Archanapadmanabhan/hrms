import React, { useState, useMemo } from 'react';
import { Upload, Download, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';

export interface CsvValidationResult<T> {
  rowNumber: number;
  raw: string[];
  valid: boolean;
  error?: string;
  data?: T;
}

interface CsvImportModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  templateFileName: string;
  headers: string[];
  sampleRows: string[][];
  validateRow: (cols: string[], rowIndex: number) => { valid: boolean; error?: string; data?: T };
  onCommit: (validItems: T[]) => void;
}

export function CsvImportModal<T>({
  isOpen,
  onClose,
  title,
  description,
  templateFileName,
  headers,
  sampleRows,
  validateRow,
  onCommit
}: CsvImportModalProps<T>) {
  const defaultCsv = useMemo(() => {
    const headerLine = headers.join(',');
    const sampleLines = sampleRows.map((r) => r.join(','));
    return [headerLine, ...sampleLines].join('\n');
  }, [headers, sampleRows]);

  const [csvText, setCsvText] = useState(defaultCsv);
  const [summary, setSummary] = useState<{ imported: number; failed: number } | null>(null);

  if (!isOpen) return null;

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const dataLines = lines.slice(1);
  const validationResults: CsvValidationResult<T>[] = dataLines.map((line, idx) => {
    const cols = parseCsvLine(line);
    const res = validateRow(cols, idx);
    return {
      rowNumber: idx + 2,
      raw: cols,
      valid: res.valid,
      error: res.error,
      data: res.data
    };
  });

  const validItems = validationResults.filter((r) => r.valid && r.data).map((r) => r.data as T);
  const errorItems = validationResults.filter((r) => !r.valid);

  const handleDownloadTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(defaultCsv);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `${templateFileName}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        setCsvText(content);
        setSummary(null);
      }
    };
    reader.readAsText(file);
  };

  const handleCommit = () => {
    if (validItems.length === 0) return;
    onCommit(validItems);
    setSummary({ imported: validItems.length, failed: errorItems.length });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
              <span>{title}</span>
            </h3>
            <p className="text-slate-500 mt-0.5">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Template & Upload Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Download className="h-3.5 w-3.5 text-indigo-600" />
              <span>Download CSV Template</span>
            </button>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              <span>Upload CSV File</span>
              <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Columns: {headers.join(', ')}
          </span>
        </div>

        {/* Raw CSV Editor */}
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            CSV Data Content (Header + Data Rows)
          </label>
          <textarea
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setSummary(null);
            }}
            rows={5}
            className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-400"
          />
        </div>

        {/* Validation Preview Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">
              Validation Preview ({validItems.length} valid, {errorItems.length} errors)
            </span>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Row #</th>
                  <th className="p-2.5">Values</th>
                  <th className="p-2.5">Validation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validationResults.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-400">
                      No data rows to validate.
                    </td>
                  </tr>
                ) : (
                  validationResults.map((row) => (
                    <tr key={row.rowNumber} className={row.valid ? 'bg-white' : 'bg-rose-50/40'}>
                      <td className="p-2.5 font-mono text-slate-500">Row {row.rowNumber}</td>
                      <td className="p-2.5 font-mono text-slate-800 truncate max-w-sm">
                        {row.raw.join(' | ')}
                      </td>
                      <td className="p-2.5">
                        {row.valid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Ready to import
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" /> {row.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {summary && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
            <span className="font-semibold">
              Import Summary: {summary.imported} row(s) imported successfully, {summary.failed} row(s) skipped due to validation errors.
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            {summary ? 'Done' : 'Cancel'}
          </button>
          {!summary && (
            <button
              type="button"
              disabled={validItems.length === 0}
              onClick={handleCommit}
              className="px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg"
            >
              Commit Import ({validItems.length} Valid Row{validItems.length === 1 ? '' : 's'})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
