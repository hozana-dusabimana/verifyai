const StatCard = ({ label, value, icon, color = 'bg-blue-50 text-blue-600', alert = false, hint }) => (
  <div className="glass rounded-2xl p-6 relative overflow-hidden group hover:shadow-lg transition-shadow">
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-slate-900 truncate">{value}</p>
          {alert && (
            <span className="flex h-3 w-3 relative ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          )}
        </div>
        {hint && <p className="text-xs text-slate-400 mt-1 truncate">{hint}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color} transition-transform group-hover:scale-110 flex-shrink-0`}>
        {icon}
      </div>
    </div>
  </div>
);

export default StatCard;
