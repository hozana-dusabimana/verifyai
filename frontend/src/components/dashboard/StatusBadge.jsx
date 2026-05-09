import { CheckCircle, ShieldAlert, HelpCircle } from 'lucide-react';

const STYLES = {
  REAL: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  FAKE: 'bg-red-100 text-red-800 border-red-200',
  UNCERTAIN: 'bg-amber-100 text-amber-800 border-amber-200',
};

const ICONS = {
  REAL: <CheckCircle className="w-3.5 h-3.5 mr-1" />,
  FAKE: <ShieldAlert className="w-3.5 h-3.5 mr-1" />,
  UNCERTAIN: <HelpCircle className="w-3.5 h-3.5 mr-1" />,
};

const StatusBadge = ({ status, score }) => {
  const safe = STYLES[status] ? status : 'UNCERTAIN';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${STYLES[safe]}`}>
      {ICONS[safe]} {safe} {score != null && `(${Math.round(score)}%)`}
    </span>
  );
};

export default StatusBadge;
