export default function Loading() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '1.25rem', paddingTop: '4rem', paddingBottom: '5rem' }}>
      <div style={{ height: 32, width: 180, borderRadius: 8, marginBottom: 6 }} className="sk" />
      <div style={{ height: 18, width: 200, borderRadius: 6, marginBottom: '1.25rem' }} className="sk" />
      <div style={{ height: 140, borderRadius: 16, marginBottom: '1rem' }} className="sk" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        {[...Array(3)].map((_, i) => <div key={i} style={{ height: 72, borderRadius: 12 }} className="sk" />)}
      </div>
      <div style={{ height: 80, borderRadius: 12, marginBottom: '1rem' }} className="sk" />
      <div style={{ height: 100, borderRadius: 12, marginBottom: '1rem' }} className="sk" />
      <div style={{ height: 220, borderRadius: 12 }} className="sk" />
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