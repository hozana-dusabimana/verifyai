import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Download, CheckCircle, ShieldAlert, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { analysisAPI } from '../services/api';

const HistoryPage = () => {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [meta, setMeta] = useState({ count: 0, next: null, previous: null });
  const [page, setPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (searchTerm) params.search = searchTerm;
      if (filterClass) params.classification = filterClass;
      const res = await analysisAPI.getHistory(params);
      setAnalyses(res.data.data || []);
      setMeta(res.data.meta || {});
    } catch {
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterClass]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleExportCSV = async (id) => {
    try {
      const res = await analysisAPI.exportCSV(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis_${id}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const StatusBadge = ({ status, score }) => {
    const styles = {
      REAL: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      FAKE: 'bg-red-100 text-red-800 border-red-200',
      UNCERTAIN: 'bg-amber-100 text-amber-800 border-amber-200',
    };
    const icons = {
      REAL: <CheckCircle className="w-3.5 h-3.5 mr-1" />,
      FAKE: <ShieldAlert className="w-3.5 h-3.5 mr-1" />,
      UNCERTAIN: <HelpCircle className="w-3.5 h-3.5 mr-1" />,
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        {icons[status]} {status || 'PENDING'} {score != null && `(${Math.round(score)}%)`}
      </span>
    );
  };

  const totalPages = Math.ceil((meta.count || 0) / 20);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analysis History</h1>
        <p className="text-slate-500 font-medium mt-1">Browse and filter all your past analysis results.</p>
      </div>

      {/* Search & Filter */}
      <div className="glass rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by title..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-brand-500 focus:border-brand-500"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </form>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select className="rounded-xl border border-slate-300 py-2.5 px-3 text-sm focus:ring-brand-500 focus:border-brand-500"
            value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setPage(1); }}>
            <option value="">All Results</option>
            <option value="REAL">Real</option>
            <option value="FAKE">Fake</option>
            <option value="UNCERTAIN">Uncertain</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : analyses.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Article</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Result</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {analyses.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900 truncate max-w-xs">{item.title || 'Untitled'}</p>
                        <p className="text-xs text-slate-500 capitalize mt-0.5">{item.input_type} input</p>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell text-sm text-slate-600">{item.source_name || '-'}</td>
                      <td className="px-6 py-4"><StatusBadge status={item.classification} score={item.credibility_score} /></td>
                      <td className="px-6 py-4 hidden md:table-cell text-sm text-slate-500">{new Date(item.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleExportCSV(item.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Export CSV">
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">{meta.count} total results</p>
                <div className="flex items-center gap-2">
                  <button disabled={!meta.previous} onClick={() => setPage(p => p - 1)}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-slate-700">Page {page} of {totalPages}</span>
                  <button disabled={!meta.next} onClick={() => setPage(p => p + 1)}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-slate-400 py-16 text-sm">No analyses found. Start by analyzing some content.</p>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
