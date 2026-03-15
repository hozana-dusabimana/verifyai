import { useState } from 'react';
import { Search, Filter, Download, Trash2, CheckCircle, ShieldAlert, AlertTriangle, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

const mockHistory = Array.from({ length: 15 }, (_, i) => ({
  id: `job-${1000 + i}`,
  title: [
    "New Infrastructure Bill Passed", "Alien Spaceship Found in Desert", "Tech Stocks Tumble After Earnings", 
    "Secret To Infinite Happiness Revealed", "Local School Board Election Results"
  ][i % 5],
  source: ["reuters.com", "truth-now.net", "bloomberg.com", "daily-miracle.org", "local-news.gov"][i % 5],
  score: [95, 12, 88, 34, 98][i % 5],
  status: ["REAL", "FAKE", "REAL", "UNCERTAIN", "REAL"][i % 5],
  date: `2026-03-${String(15 - i).padStart(2, '0')} 14:30`
}));

const HistoryPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedItems, setSelectedItems] = useState([]);

  const filteredHistory = mockHistory.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || item.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'ALL' || item.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredHistory.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredHistory.map(i => i.id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(i => i !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const getStatusBadge = (status, score) => {
    const styles = {
      REAL: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      FAKE: 'bg-red-100 text-red-800 border-red-200',
      UNCERTAIN: 'bg-amber-100 text-amber-800 border-amber-200',
    };
    const icons = {
      REAL: <CheckCircle className="w-3.5 h-3.5 mr-1" />,
      FAKE: <ShieldAlert className="w-3.5 h-3.5 mr-1" />,
      UNCERTAIN: <AlertTriangle className="w-3.5 h-3.5 mr-1" />,
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status]}`}>
        {icons[status]} {status} ({score}%)
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analysis History</h1>
          <p className="text-slate-500 font-medium mt-1">Review and export your past verification results.</p>
        </div>
        
        <div className="flex gap-2">
           <button 
              disabled={selectedItems.length === 0}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                selectedItems.length > 0 ? 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-transparent'
              }`}
            >
              <Download className="w-4 h-4" /> Export ({selectedItems.length})
           </button>
           <button 
              disabled={selectedItems.length === 0}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                selectedItems.length > 0 ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-transparent'
              }`}
            >
              <Trash2 className="w-4 h-4" /> Delete
           </button>
        </div>
      </div>

      <div className="glass rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-white/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm shadow-sm transition-all text-slate-900"
              placeholder="Search history by title or source..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="flex items-center text-sm font-bold text-slate-600">
               <Filter className="w-4 h-4 mr-2" /> Status:
             </div>
             <div className="flex bg-slate-100 p-1 rounded-lg">
                {['ALL', 'REAL', 'FAKE', 'UNCERTAIN'].map(status => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                      selectedStatus === status ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300 rounded cursor-pointer"
                    checked={selectedItems.length === filteredHistory.length && filteredHistory.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Article Info</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Source Domain</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Classification</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date Analyzed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-slate-300 rounded cursor-pointer"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-brand-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 truncate max-w-[200px] lg:max-w-md">{item.title}</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5 md:hidden">{item.source}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell text-sm font-medium text-slate-600">
                      {item.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status, item.score)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell text-sm font-medium text-slate-500">
                      {item.date}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-sm font-medium text-slate-500">
                    No analyses found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Setup */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700">
                Showing <span className="font-bold">1</span> to <span className="font-bold">{filteredHistory.length}</span> of <span className="font-bold">{filteredHistory.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50">
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-bold text-brand-600 bg-brand-50 z-10">
                  1
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50">
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
