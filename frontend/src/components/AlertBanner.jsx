import useAlerts from '../hooks/useAlerts';

export default function AlertBanner() {
  const { alerts } = useAlerts();
  const latest = alerts[alerts.length - 1];
  if (!latest) return null;

  const colors = {
    INCIDENT: 'var(--red)',
    SOS: 'var(--red)',
    CORRIDOR_ACTIVATED: 'var(--green)',
    CORRIDOR_RESET: 'var(--cyan)',
    NARRATOR: 'var(--orange)',
  };
  const borderColor = colors[latest.type] || 'var(--cyan)';

  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, maxWidth: 600, width: '90%',
        background: 'var(--bg-card)', border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 8, padding: '12px 20px',
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--text-primary)',
        boxShadow: `0 0 30px rgba(0,0,0,0.5)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: borderColor, fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5 }}>
          {latest.type}
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
          {latest.timestamp ? new Date(latest.timestamp).toLocaleTimeString() : ''}
        </span>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>
        {latest.payload?.narrative || latest.payload?.description || JSON.stringify(latest.payload).slice(0, 120)}
      </div>
    </div>
  );
}
