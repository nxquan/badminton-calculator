export default function PlayersPage({ 
  playerNames, 
  onAddClick, 
  onEditClick, 
  onDeleteClick 
}) {
  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: 'space-between' }}>
        <span>🧑 Người chơi</span>
        <button className="btn btn-add" onClick={onAddClick}>➕ Thêm người chơi</button>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {playerNames.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Chưa có người chơi nào.</p>
          ) : (
            playerNames.map((p) => (
              <div key={p} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, background: '#F7F9FC', borderRadius: 6 }}>
                <div style={{ flex: 1 }}>{p}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => onEditClick(p)}>✎</button>
                  <button className="btn btn-danger-soft btn-sm" onClick={() => {
                    if (confirm(`Xóa người chơi "${p}"?`)) onDeleteClick(p)
                  }}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
