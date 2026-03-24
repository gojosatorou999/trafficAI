export default function SeverityBadge({ severity }) {
  const level = (severity || 'LOW').toUpperCase();
  const cls = level === 'CRITICAL' || level === 'HIGH' ? 'high' : level === 'MEDIUM' ? 'medium' : 'low';
  return <span className={`severity-badge ${cls}`}>{level}</span>;
}
