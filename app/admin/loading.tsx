export default function Loading() {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease', padding: '1.5rem' }}>
      <div style={{ height: 36, width: 200, background: 'var(--bg-3)', borderRadius: 8, marginBottom: 8 }} className="skeleton" />
      <div style={{ height: 20, width: 140, background: 'var(--bg-3)', borderRadius: 6, marginBottom: '1.5rem' }} className="skeleton" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ height: 90, background: 'var(--bg-3)', borderRadius: 12 }} className="skeleton" />
        ))}
      </div>
      <div style={{ height: 200, background: 'var(--bg-3)', borderRadius: 12, marginBottom: '1rem' }} className="skeleton" />
      <div style={{ height: 300, background: 'var(--bg-3)', borderRadius: 12 }} className="skeleton" />
      <style>{`
        .skeleton {
          background: linear-gradient(90deg, var(--bg-3) 25%, var(--bg-4) 50%, var(--bg-3) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}