import { useTranslation } from 'react-i18next';

const TrustGauge = ({ score, size = 140 }) => {
  const { t } = useTranslation();
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, score ?? 0));
  const offset = circumference - (safeScore / 100) * circumference;

  const stroke =
    safeScore >= 70 ? '#10b981'
      : safeScore >= 40 ? '#f59e0b'
        : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900">{safeScore}%</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">{t('widgets.trustGauge.label')}</span>
      </div>
    </div>
  );
};

export default TrustGauge;
