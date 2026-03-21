import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Link as LinkIcon, UploadCloud, Search, CheckCircle, AlertTriangle, ShieldAlert, ChevronRight, Download, Share2, Flag, FileCheck } from 'lucide-react';
import { analysisAPI } from '../services/api';

const stages = [
  "Input Validation", "Content Fetching", "Preprocessing",
  "Feature Extraction", "Model Inference", "Score Generation", "Persistence & Notify"
];

const AnalyzePage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('text');
  const [inputVal, setInputVal] = useState(location.state?.text || '');
  const [sourceName, setSourceName] = useState('');
  const [author, setAuthor] = useState('');
  const [pubDate, setPubDate] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const pollStatus = (analysisId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await analysisAPI.getStatus(analysisId);
        const data = res.data.data;
        const stage = data.current_stage || 0;
        setCurrentStage(stage > 0 ? stage - 1 : 0);
        setProgress(Math.min((stage / stages.length) * 100, 100));

        if (data.status === 'completed') {
          clearInterval(pollRef.current);
          const fullRes = await analysisAPI.getResult(analysisId);
          setResult(fullRes.data.data);
          setIsAnalyzing(false);
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current);
          setError(data.error_message || 'Analysis failed.');
          setIsAnalyzing(false);
        }
      } catch {
        clearInterval(pollRef.current);
        setError('Failed to poll analysis status.');
        setIsAnalyzing(false);
      }
    }, 1000);
  };

  const startAnalysis = async (e) => {
    e.preventDefault();
    setError('');
    setIsAnalyzing(true);
    setResult(null);
    setProgress(0);
    setCurrentStage(0);

    try {
      let submitData;
      if (activeTab === 'file' && selectedFile) {
        submitData = new FormData();
        submitData.append('input_type', 'file');
        submitData.append('file', selectedFile);
        if (sourceName) submitData.append('source_name', sourceName);
        if (author) submitData.append('author', author);
        if (pubDate) submitData.append('publication_date', pubDate);
      } else {
        submitData = {
          input_type: activeTab === 'url' ? 'url' : 'text',
          ...(activeTab === 'url' ? { url: inputVal } : { content: inputVal }),
          source_name: sourceName,
          author,
          publication_date: pubDate || undefined,
        };
      }

      const res = await analysisAPI.submit(submitData);
      const analysisData = res.data.data;

      if (analysisData.status === 'completed') {
        // Eager mode — task already ran synchronously
        const fullRes = await analysisAPI.getResult(analysisData.id);
        setResult(fullRes.data.data);
        setProgress(100);
        setCurrentStage(stages.length - 1);
        setIsAnalyzing(false);
      } else {
        pollStatus(analysisData.id);
      }
    } catch (err) {
      const msg = err.response?.data?.error;
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Submission failed.');
      setIsAnalyzing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!result) return;
    try {
      const res = await analysisAPI.exportPDF(result.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis_${result.id}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const handleFlag = async () => {
    if (!result) return;
    try {
      await analysisAPI.flag(result.id);
      setResult({ ...result, is_flagged_for_review: true });
    } catch { /* ignore */ }
  };

  const getGaugeColor = (score) => {
    if (score <= 30) return '#ef4444';
    if (score <= 60) return '#f59e0b';
    return '#10b981';
  };

  const getRiskBand = (score) => {
    if (score <= 30) return { label: 'HIGH RISK', color: 'text-red-600' };
    if (score <= 60) return { label: 'UNCERTAIN', color: 'text-amber-600' };
    return { label: 'CREDIBLE', color: 'text-emerald-600' };
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">AI Content Analysis</h1>
        <p className="text-slate-500 font-medium mt-1">Submit an article or URL to verify its credibility against our ML ensemble.</p>
      </div>

      {/* Input Section */}
      <div className="glass rounded-3xl p-8 shadow-sm">
        <div className="flex space-x-1 p-1 bg-slate-100 rounded-xl mb-6 max-w-md">
          {[
            { id: 'text', label: 'Paste Text', icon: <FileText className="w-4 h-4 mr-2" /> },
            { id: 'url', label: 'Enter URL', icon: <LinkIcon className="w-4 h-4 mr-2" /> },
            { id: 'file', label: 'Upload File', icon: <UploadCloud className="w-4 h-4 mr-2" /> }
          ].map((tab) => (
            <button key={tab.id}
              onClick={() => { setActiveTab(tab.id); setInputVal(''); setSelectedFile(null); }}
              className={`flex-1 flex items-center justify-center py-2.5 text-sm font-bold rounded-lg transition-all ${
                activeTab === tab.id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={startAnalysis} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
          )}

          {activeTab === 'text' && (
            <textarea className="w-full h-48 border border-slate-300 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none shadow-sm"
              placeholder="Paste the full article text here (min 50 characters)..." value={inputVal} onChange={(e) => setInputVal(e.target.value)} required />
          )}
          {activeTab === 'url' && (
            <input type="url" className="w-full border border-slate-300 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm"
              placeholder="https://example.com/news-article" value={inputVal} onChange={(e) => setInputVal(e.target.value)} required />
          )}
          {activeTab === 'file' && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 hover:border-brand-400 transition-colors cursor-pointer group flex flex-col items-center justify-center"
              onClick={() => document.getElementById('file-upload').click()}>
              <input id="file-upload" type="file" accept=".txt,.pdf" className="hidden"
                onChange={(e) => { setSelectedFile(e.target.files[0]); setInputVal(e.target.files[0]?.name || ''); }} />
              <div className="p-4 bg-brand-50 rounded-full group-hover:scale-110 transition-transform mb-4">
                <UploadCloud className="w-8 h-8 text-brand-500" />
              </div>
              <p className="text-slate-700 font-bold">{selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}</p>
              <p className="text-slate-500 text-sm mt-1">.txt or .pdf up to 10MB</p>
            </div>
          )}

          <details className="group cursor-pointer">
            <summary className="text-sm font-bold text-slate-600 flex items-center hover:text-brand-600 transition-colors w-max list-none">
              <ChevronRight className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" /> Add Optional Metadata
            </summary>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pl-5">
              <input type="text" placeholder="Source Name" value={sourceName} onChange={(e) => setSourceName(e.target.value)}
                className="border border-slate-300 rounded-lg p-3 text-sm focus:ring-brand-500 focus:border-brand-500" />
              <input type="text" placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)}
                className="border border-slate-300 rounded-lg p-3 text-sm focus:ring-brand-500 focus:border-brand-500" />
              <input type="date" value={pubDate} onChange={(e) => setPubDate(e.target.value)}
                className="border border-slate-300 rounded-lg p-3 text-sm focus:ring-brand-500 focus:border-brand-500 text-slate-500" />
            </div>
          </details>

          <button type="submit" disabled={isAnalyzing || (!inputVal && activeTab !== 'file')}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold flex items-center justify-center transition-all ${
              isAnalyzing || (!inputVal && activeTab !== 'file') ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-700 shadow-md hover:shadow-lg'
            }`}>
            {isAnalyzing ? (
              <span className="flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" /> Processing Pipeline...</span>
            ) : (
              <span className="flex items-center gap-2"><Search className="w-5 h-5" /> Analyze Content</span>
            )}
          </button>
        </form>
      </div>

      {/* Progress Pipeline */}
      {isAnalyzing && (
        <div className="glass rounded-3xl p-8 shadow-sm border-t-4 border-t-brand-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-900">ML Pipeline Execution</h3>
            <span className="text-sm font-bold text-brand-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 mb-6 overflow-hidden">
            <div className="bg-brand-500 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {stages.map((stage, idx) => (
              <div key={idx} className={`flex flex-col items-center text-center gap-2 p-2 rounded-lg transition-colors ${idx === currentStage ? 'bg-brand-50' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  idx < currentStage ? 'bg-emerald-500 border-emerald-500 text-white' :
                  idx === currentStage ? 'bg-white border-brand-500 text-brand-600 shadow-sm animate-pulse' :
                  'bg-white border-slate-200 text-slate-400'
                }`}>
                  {idx < currentStage ? <CheckCircle className="w-5 h-5" /> : (idx + 1)}
                </div>
                <span className={`text-xs font-medium ${idx <= currentStage ? 'text-slate-800' : 'text-slate-400'}`}>{stage}</span>
                {idx === currentStage && <span className="text-[10px] text-brand-500 animate-pulse font-bold mt-[-4px]">Running</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result Panel */}
      {result && !isAnalyzing && (
        <div className="glass rounded-3xl overflow-hidden shadow-xl border border-slate-200 relative">
          {/* Status Banner */}
          <div className={`px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ${
            result.classification === 'FAKE' ? 'bg-red-50 text-red-900 border-red-100' :
            result.classification === 'REAL' ? 'bg-emerald-50 text-emerald-900 border-emerald-100' :
            'bg-amber-50 text-amber-900 border-amber-100'
          }`}>
            <div className="flex items-center gap-3">
              {result.classification === 'FAKE' ? <ShieldAlert className="w-8 h-8 text-red-600" /> :
               result.classification === 'REAL' ? <CheckCircle className="w-8 h-8 text-emerald-600" /> :
               <AlertTriangle className="w-8 h-8 text-amber-600" />}
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">Classification: {result.classification}</h2>
                <p className="text-sm font-medium opacity-80 mt-0.5">Confidence Level: {result.confidence ? Math.round(result.confidence) : 0}%</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleExportPDF} className="p-2 rounded-lg bg-white/50 hover:bg-white text-slate-700 font-bold transition-colors border border-slate-200 shadow-sm" title="Export PDF">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg bg-white/50 hover:bg-white text-slate-700 font-bold transition-colors border border-slate-200 shadow-sm" title="Share">
                <Share2 className="w-5 h-5" />
              </button>
              <button onClick={handleFlag} className={`p-2 rounded-lg bg-white/50 hover:bg-white font-bold transition-colors border border-slate-200 shadow-sm ${result.is_flagged_for_review ? 'text-red-600' : 'text-slate-500'}`} title="Flag manually">
                <Flag className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 bg-white">
            {/* Score Gauge */}
            <div className="flex flex-col items-center justify-center p-6 border border-slate-100 rounded-2xl bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Credibility Score</h3>
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <path className="text-slate-200" strokeWidth="3" stroke="currentColor" fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path style={{ stroke: getGaugeColor(result.credibility_score), strokeDasharray: `${result.credibility_score}, 100` }}
                    strokeWidth="3" strokeLinecap="round" fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-extrabold text-slate-900">{Math.round(result.credibility_score)}</span>
                  <span className="text-sm font-bold text-slate-500 mt-1">/ 100</span>
                </div>
              </div>
              <p className="mt-6 text-sm font-medium text-slate-600 text-center">
                Score falls into the <strong className={getRiskBand(result.credibility_score).color}>{getRiskBand(result.credibility_score).label}</strong> band.
              </p>
            </div>

            {/* Feature Breakdown */}
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase">Sentiment Score</p>
                  <p className="font-bold text-slate-900 mt-1">{result.sentiment_score != null ? result.sentiment_score.toFixed(2) : 'N/A'}</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase">Emotional Tone</p>
                  <p className="font-bold text-slate-900 mt-1">{result.emotional_tone || 'N/A'}</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Sensationalism Index</p>
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(result.sensationalism_score || 0) * 100}%` }}></div>
                  </div>
                  <p className="text-right text-xs font-bold text-amber-600">{result.sensationalism_score != null ? Math.round(result.sensationalism_score * 100) : 0}%</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Headline Consistency</p>
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(result.headline_body_consistency || 0) * 100}%` }}></div>
                  </div>
                  <p className="text-right text-xs font-bold text-blue-600">{result.headline_body_consistency != null ? Math.round(result.headline_body_consistency * 100) : 0}%</p>
                </div>
              </div>

              {/* Explainability */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex-1">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-brand-500" /> Why was this flagged?
                </h3>
                <ul className="space-y-3">
                  {(result.flagging_reasons || []).map((reason, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-slate-700">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs mt-0.5">{idx + 1}</span>
                      <span className="font-medium leading-relaxed">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyzePage;
