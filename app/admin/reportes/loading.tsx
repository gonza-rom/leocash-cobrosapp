export default function Loading() {
  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ height: 36, width: 140, borderRadius: 8, marginBottom: 8 }} className="sk" />
      <div style={{ height: 160, borderRadius: 12, marginBottom: '1rem' }} className="sk" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        {[...Array(6)].map((_, i) => <div key={i} style={{ height: 80, borderRadius: 12 }} className="sk" />)}
      </div>
      <div style={{ height: 12, borderRadius: 6, marginBottom: '1.25rem' }} className="sk" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ height: 300, borderRadius: 12 }} className="sk" />
        <div style={{ height: 300, borderRadius: 12 }} className="sk" />
      </div>
      <Shimmer />
    </div>
  )
}

function Shimmer() {
  return (
    <style>{`
      .sk { background: linear-gradient(90deg, var(--bg-3) 25%, var(--bg-4) 50%, var(--bg-3) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
      @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    `}</style>
  )
}