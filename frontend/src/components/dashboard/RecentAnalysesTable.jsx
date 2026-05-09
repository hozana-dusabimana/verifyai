import { Link, useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { analysisAPI } from '../../services/api';

const RecentAnalysesTable = ({ items = [], showSource = true, showCite = false, emptyMessage }) => {
  const navigate = useNavigate();

  const handleExport = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await analysisAPI.exportPDF(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analysis-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore
    }
  };

  return (
    <div className="glass rounded-2xl px-6 py-5 shadow-sm">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-bold text-slate-900">Recent Analyses</h2>
        <Link to="/history" className="text-sm font-medium text-brand-600 hover:text-brand-700">View All</Link>
      </div>
      <div className="overflow-x-auto">
        {items.length > 0 ? (
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Article</th>
                {showSource && (
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Source</th>
                )}
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                {showCite && <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Cite</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/history')}
                >
                  <td className="px-3 py-4">
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[200px] md:max-w-xs">{item.title || 'Untitled'}</p>
                  </td>
                  {showSource && (
                    <td className="px-3 py-4 hidden sm:table-cell text-sm text-slate-600 font-medium">{item.source_name || '-'}</td>
                  )}
                  <td className="px-3 py-4">
                    <StatusBadge status={item.classification} score={item.credibility_score} />
                  </td>
                  <td className="px-3 py-4 text-right text-sm text-slate-500 hidden md:table-cell">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                  </td>
                  {showCite && (
                    <td className="px-3 py-4 text-right">
                      <button
                        onClick={(e) => handleExport(e, item.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50"
                        title="Export PDF citation"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-slate-400 py-8 text-sm">
            {emptyMessage || 'No analyses yet. Submit your first article to get started.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default RecentAnalysesTable;
