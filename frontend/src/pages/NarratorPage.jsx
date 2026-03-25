import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

const BADGE_COLORS = {
  CRASH: { bg: 'var(--red-dim)', color: 'var(--red)', border: 'rgba(239,68,68,0.3)' },
  SOS: { bg: 'var(--red-dim)', color: 'var(--red)', border: 'rgba(239,68,68,0.3)' },
  FATIGUE: { bg: 'var(--orange-dim)', color: 'var(--orange)', border: 'rgba(245,158,11,0.3)' },
  CORRIDOR: { bg: 'var(--green-dim)', color: 'var(--green)', border: 'rgba(16,185,129,0.3)' },
  WRONG_ROUTE: { bg: 'var(--cyan-dim)', color: 'var(--cyan)', border: 'rgba(0,240,255,0.3)' },
  SLOWDOWN: { bg: 'var(--orange-dim)', color: 'var(--orange)', border: 'rgba(245,158,11,0.3)' },
  STATIONARY: { bg: 'var(--orange-dim)', color: 'var(--orange)', border: 'rgba(245,158,11,0.3)' },
};

function getTypeBadge(type) {
  const t = (type || 'CRASH').toUpperCase();
  return BADGE_COLORS[t] || BADGE_COLORS.CRASH;
}

function speakText(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 0.9;
  utterance.volume = 1;
  // Try to pick a good English voice
  const voices = window.speechSynthesis.getVoices();
  const english = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                  voices.find(v => v.lang.startsWith('en')) ||
                  voices[0];
  if (english) utterance.voice = english;
  window.speechSynthesis.speak(utterance);
}

export default function NarratorPage() {
  const { data: logs = [], refetch, isFetching } = useQuery({
    queryKey: ['narrator-logs'],
    queryFn: () => api.get('/api/narrator/logs').then(res => res.data),
    refetchInterval: 5000,
  });

  const handleTestBroadcast = async () => {
    try {
      const res = await api.post('/api/narrator/broadcast-test');
      refetch();
      // Auto-speak the new broadcast
      if (res.data?.narrative) {
        speakText(res.data.narrative);
      }
    } catch (e) { console.error('Failed to trigger test broadcast', e); }
  };

  return (
    <div className="page" style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-title">NARRATOR FEED</div>
        <div className="page-subtitle">
          Real-time synthesized voice logs and automated broadcast history for Hyderabad Smart Corridor transit monitoring.
        </div>
      </div>

      {/* Broadcast Test Button */}
      <button
        className="btn btn-cyan"
        onClick={handleTestBroadcast}
        disabled={isFetching}
        style={{ width: '100%', marginBottom: 20, padding: '14px 20px' }}
      >
        📡 BROADCAST TEST
      </button>

      {/* Narrator Cards */}
      {logs.map((log) => {
        const badge = getTypeBadge(log.incident_type);
        return (
          <div key={log.id} className="narrator-card animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  className="narrator-badge"
                  style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                >
                  {log.incident_type || 'ALERT'}
                </span>
                <span className="narrator-id">ID: NR-{String(log.id).padStart(4, '0')}</span>
              </div>
              <span className="narrator-time">
                BROADCAST_AT: {log.broadcast_at ? new Date(log.broadcast_at).toLocaleTimeString() : '—'}
              </span>
            </div>

            <div className="narrator-text">
              "{log.narrative}"
            </div>

            <div className="narrator-actions">
              <button className="narrator-action-btn" title="Copy" onClick={() => navigator.clipboard?.writeText(log.narrative || '')}>📋</button>
              <button className="narrator-action-btn" title="Like">👍</button>
              <button className="narrator-action-btn" title="Play aloud" onClick={() => speakText(log.narrative || '')}>🔊</button>
            </div>
          </div>
        );
      })}

      {logs.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 60,
          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)',
          border: '1px dashed var(--border)', borderRadius: 8,
        }}>
          NO ACTIVE BROADCASTS — Click "BROADCAST TEST" to generate one
        </div>
      )}

      {logs.length > 0 && (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>⟳</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>
            END OF VISIBLE BROADCAST HISTORY
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
            ARCHIVE LOGS ACCESSIBLE VIA SYSTEM EXPLORER
          </div>
          <button className="btn" style={{ marginTop: 16 }}>LOAD PREVIOUS 50 LOGS</button>
        </div>
      )}
    </div>
  );
}
