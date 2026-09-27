import type { Report } from '../types';

export function ReportCard({ report }: { report: Report }) {
  const date = new Date(report.created_at).toLocaleString();
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-blue-400">@{report.user}</span>
        <span className="text-xs text-gray-600">{date}</span>
      </div>
      <p className="text-sm text-gray-300">{report.content}</p>
    </div>
  );
}
