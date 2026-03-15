import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Link as LinkIcon, UploadCloud, Search, CheckCircle, AlertTriangle, ShieldAlert, ChevronRight, Download, Share2, Flag, FileCheck } from 'lucide-react';

const stages = [
  "Input Validation",
  "Content Fetching",
  "Preprocessing",
  "Feature Extraction",
  "Model Inference",
  "Score Generation",
  "Persistence & Notify"
];

const mockResult = {
  score: 18,
  status: 'FAKE',
  confidence: 94.2,
  sentiment: 'Negative (-0.8)',
  emotionalTone: 'High Anger/Fear',
  sensationalism: 85, // out of 100
  consistency: 42, // out of 100
  reasons: [
    "Headline contains exaggerated emotional triggers not supported by the body text.",
    "Multiple claims lack citations to verifiable primary sources.",
    "High frequency of known polarizing keywords and phrases.",
    "Domain has a history of publishing fact-checked false information.",
    "Author metadata is missing or uses a known pseudonym."
  ]
};

const AnalyzePage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('text');
  const [inputVal, setInputVal] = useState(location.state?.text || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [result, setResult] = useState(null);

  const startAnalysis = (e) => {
    e.preventDefault();
    if (!inputVal) return;
    
    setIsAnalyzing(true);
    setResult(null);
    setProgress(0);
    setCurrentStage(0);

    // Mock progress via WebSocket/Celery pipeline
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setProgress(Math.min((step / stages.length) * 100, 100));
      setCurrentStage(step - 1);
      
      if (step >= stages.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsAnalyzing(false);
          setResult(mockResult); // Mocking a FAKE result
        }, 500);
      }
    }, 500); // 500ms per stage purely for demo
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'FAKE': return 'text-red-600 bg-red-50 border-red-200';
      case 'REAL': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-amber-600 bg-amber-50 border-amber-200';
    }
  };

  const getGaugeColor = (score) => {
    if (score <= 30) return '#ef4444'; // red-500
    if (score <= 60) return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">AI Content Analysis</h1>
        <p className="text-slate-500 font-medium mt-1">Submit an article or URL to verify its credibility against our ML ensemble.</p>
      </div>

      {/* Input Section */}
      <div className="glass rounded-3xl p-8 shadow-sm">
        {/* Tabs */}
        <div className="flex space-x-1 p-1 bg-slate-100 rounded-xl mb-6 max-w-md">
          {[
            { id: 'text', label: 'Paste Text', icon: <FileText className="w-4 h-4 mr-2" /> },
            { id: 'url', label: 'Enter URL', icon: <LinkIcon className="w-4 h-4 mr-2" /> },
            { id: 'file', label: 'Upload File', icon: <UploadCloud className="w-4 h-4 mr-2" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setInputVal(''); }}
              className={`flex-1 flex items-center justify-center py-2.5 text-sm font-bold rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={startAnalysis} className="space-y-6">
          {activeTab === 'text' && (
            <textarea
              className="w-full h-48 border border-slate-300 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none shadow-sm transition-all"
              placeholder="Paste the full article text here (min 50 characters)..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              required
            />
          )}
          {activeTab === 'url' && (
            <input
              type="url"
              className="w-full border border-slate-300 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all"
              placeholder="https://example.com/news-article"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              required
            />
          )}
          {activeTab === 'file' && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 hover:border-brand-400 transition-colors cursor-pointer group flex flex-col items-center justify-center">
              <div className="p-4 bg-brand-50 rounded-full group-hover:scale-110 transition-transform mb-4">
                <UploadCloud className="w-8 h-8 text-brand-500" />
              </div>
              <p className="text-slate-700 font-bold">Click to upload or drag and drop</p>
              <p className="text-slate-500 text-sm mt-1">.txt, .pdf, or .docx up to 10MB</p>
            </div>
          )}

          {/* Optional Metadata */}
          <details className="group cursor-pointer">
            <summary className="text-sm font-bold text-slate-600 flex items-center hover:text-brand-600 transition-colors w-max list-none">
              <ChevronRight className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" />
              Add Optional Metadata
            </summary>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pl-5">
              <input type="text" placeholder="Source Name" className="border border-slate-300 rounded-lg p-3 text-sm focus:ring-brand-500 focus:border-brand-500" />
              <input type="text" placeholder="Author" className="border border-slate-300 rounded-lg p-3 text-sm focus:ring-brand-500 focus:border-brand-500" />
              <input type="date" className="border border-slate-300 rounded-lg p-3 text-sm focus:ring-brand-500 focus:border-brand-500 text-slate-500" />
            </div>
          </details>

          <button
            type="submit"
            disabled={isAnalyzing || (!inputVal && activeTab !== 'file')}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold flex items-center justify-center transition-all ${
              isAnalyzing || (!inputVal && activeTab !== 'file')
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-brand-600 text-white hover:bg-brand-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                Processing Pipeline...
              </span>
            ) : (
              <span className="flex items-center gap-2"><Search className="w-5 h-5"/> Analyze Content</span>
            )}
          </button>
        </form>
      </div>

      {/* Progress Pipeline */}
      {isAnalyzing && (
        <div className="glass rounded-3xl p-8 shadow-sm border-t-4 border-t-brand-500 animate-in fade-in slide-in-from-bottom-4">
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
                <span className={`text-xs font-medium ${idx <= currentStage ? 'text-slate-800' : 'text-slate-400'}`}>
                  {stage}
                </span>
                {idx === currentStage && <span className="text-[10px] text-brand-500 animate-pulse font-bold mt-[-4px]">Running</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result Panel */}
      {result && !isAnalyzing && (
        <div className="glass rounded-3xl overflow-hidden shadow-xl border border-slate-200 animate-in zoom-in-95 duration-500 fade-in relative">
           
          {/* Status Banner */}
          <div className={`px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ${
            result.status === 'FAKE' ? 'bg-red-50 text-red-900 border-red-100' :
            result.status === 'REAL' ? 'bg-emerald-50 text-emerald-900 border-emerald-100' :
            'bg-amber-50 text-amber-900 border-amber-100'
          }`}>
            <div className="flex items-center gap-3">
              {result.status === 'FAKE' ? <ShieldAlert className="w-8 h-8 text-red-600" /> : result.status === 'REAL' ? <CheckCircle className="w-8 h-8 text-emerald-600" /> : <AlertTriangle className="w-8 h-8 text-amber-600" />}
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">Classification: {result.status}</h2>
                <p className={`text-sm font-medium opacity-80 mt-0.5`}>Confidence Level: {result.confidence}%</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button className="p-2 rounded-lg bg-white/50 hover:bg-white text-slate-700 font-bold transition-colors border border-slate-200 shadow-sm" title="Export PDF">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg bg-white/50 hover:bg-white text-slate-700 font-bold transition-colors border border-slate-200 shadow-sm" title="Share">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg bg-white/50 hover:bg-white text-red-600 font-bold transition-colors border border-slate-200 shadow-sm" title="Flag manually">
                <Flag className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 bg-white">
            {/* Score Visualization */}
            <div className="flex flex-col items-center justify-center p-6 border border-slate-100 rounded-2xl bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Credibility Score</h3>
              
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <path
                    className="text-slate-200"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    style={{ stroke: getGaugeColor(result.score), strokeDasharray: `${result.score}, 100` }}
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-extrabold text-slate-900">{result.score}</span>
                  <span className="text-sm font-bold text-slate-500 mt-1">/ 100</span>
                </div>
              </div>
              <p className="mt-6 text-sm font-medium text-slate-600 text-center">Score falls into the <strong className="text-red-600">HIGH RISK</strong> band.</p>
            </div>

            {/* Feature Breakdown */}
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase">Sentiment Score</p>
                  <p className="font-bold text-slate-900 mt-1 flex items-center">{result.sentiment}</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase">Emotional Tone</p>
                  <p className="font-bold text-slate-900 mt-1">{result.emotionalTone}</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Sensationalism Index</p>
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                    <div className="bg-amber-500 h-2 rounded-full" style={{width: `${result.sensationalism}%`}}></div>
                  </div>
                  <p className="text-right text-xs font-bold text-amber-600">{result.sensationalism}%</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Headline Consistency</p>
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                    <div className="bg-red-500 h-2 rounded-full" style={{width: `${result.consistency}%`}}></div>
                  </div>
                  <p className="text-right text-xs font-bold text-red-600">{result.consistency}%</p>
                </div>
              </div>

              {/* Explainability Panel */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex-1">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-brand-500"/> Why was this flagged?
                </h3>
                <ul className="space-y-3">
                  {result.reasons.map((reason, idx) => (
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
