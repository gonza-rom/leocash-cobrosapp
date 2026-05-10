export default function Loading() {
  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ height: 36, width: 160, borderRadius: 8, marginBottom: 8 }} className="sk" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[...Array(4)].map((_, i) => <div key={i} style={{ height: 90, borderRadius: 12 }} className="sk" />)}
      </div>
      <div style={{ height: 44, borderRadius: 8, marginBottom: '1rem' }} className="sk" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[...Array(5)].map((_, i) => <div key={i} style={{ height: 160, borderRadius: 12 }} className="sk" />)}
      </div>
      <style>{`
        .sk { background: linear-gradient(90deg, #e8eaf0 25%, #d0d3de 50%, #e8eaf0 75%); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  )
}