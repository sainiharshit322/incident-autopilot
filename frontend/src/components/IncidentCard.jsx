function timeAgo(dateString) {
  const diff = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const SEVERITY_STYLES = {
  P1: { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' },
  P2: { background: '#fffbeb', color: '#b45309', border: '1px solid #fde047' },
  P3: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
};

const STATUS_STYLES = {
  OPEN:          { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' },
  INVESTIGATING: { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  RESOLVED:      { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
};

const badge = (label, styleMap) => {
  const s = styleMap[label] || { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
  return (
    <span style={{
      ...s,
      fontSize: 11,
      fontWeight: 600,
      padding: '3px 9px',
      borderRadius: 6,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {label}
    </span>
  );
};

export default function IncidentCard({ incident, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '16px 20px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.07)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{incident.alertName}</span>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {badge(incident.severity, SEVERITY_STYLES)}
          {badge(incident.status, STATUS_STYLES)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: '#475569' }}>
          <span style={{ fontWeight: 500, color: '#334155' }}>{incident.service}</span>
        </span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{timeAgo(incident.createdAt)}</span>
      </div>

      {incident.rootCause && (
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
          {incident.rootCause.length > 120
            ? incident.rootCause.slice(0, 120) + '…'
            : incident.rootCause}
        </p>
      )}
    </div>
  );
}