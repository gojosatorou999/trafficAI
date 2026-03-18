export const severityColors = {
  LOW: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  MEDIUM: 'bg-orange-100 text-orange-800 border-orange-200',
  HIGH: 'bg-red-100 text-red-800 border-red-200',
  CRITICAL: 'bg-rose-900 text-rose-100 border-rose-800',
};

export default function SeverityBadge({ severity }) {
  const colorClass = severityColors[severity] || severityColors.LOW;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {severity}
    </span>
  );
}
