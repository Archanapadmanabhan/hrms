import React, { useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';

interface ExportButtonProps {
  data: Record<string, any>[];
  fileName: string;
  label?: string;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  fileName,
  label = 'Export CSV',
  disabled = false
}) => {
  const [exportedCount, setExportedCount] = useState<number | null>(null);

  const handleExport = () => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvRows: string[] = [];

    csvRows.push(headers.map((h) => `"${h}"`).join(','));

    data.forEach((row) => {
      const values = headers.map((header) => {
        const val = row[header];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportedCount(data.length);
    window.setTimeout(() => setExportedCount(null), 2500);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {exportedCount !== null ? (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-emerald-700 font-semibold">Exported ({exportedCount})</span>
        </>
      ) : (
        <>
          <Download className="h-3.5 w-3.5" />
          <span>{label} ({data.length})</span>
        </>
      )}
    </button>
  );
};
