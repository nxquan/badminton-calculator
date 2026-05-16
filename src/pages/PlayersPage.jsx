export default function PlayersPage({ 
  players = [],
  onAddClick, 
  onEditClick, 
  onDeleteClick,
  playerStats = {},
}) {
  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: 'space-between' }}>
        <span>🧑 Người chơi</span>
        <button className="btn btn-add" onClick={onAddClick}>➕ Thêm người chơi</button>
      </div>
      <div style={{ padding: '8px 12px 0 12px', display: 'flex', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
        <div style={{ width: 100 }}>Tên</div>
        <div style={{ width: 140, textAlign: 'right' }}>Tổng lần tham gia</div>
        <div style={{ width: 140, textAlign: 'right' }}>Trung bình / tháng</div>
        <div style={{ width: 140, textAlign: 'right' }}>Thắng / Tổng</div>
        <div style={{ flex: 1 }} />
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {players.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Chưa có người chơi nào.</p>
          ) : (
            players.map((p) => (
              <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, background: '#F7F9FC', borderRadius: 6 }}>
                <div style={{ width: 100 }}>{p.name}</div>
                <div style={{ width: 140, textAlign: 'right', color: 'var(--text-secondary)' }}>{playerStats?.[p.name]?.total || 0}</div>
                <div style={{ width: 140, textAlign: 'right', color: 'var(--text-secondary)' }}>{playerStats?.[p.name]?.avgPerMonth ?? 0}</div>
                <div style={{ width: 140, textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>{`0/0`}</div>
                <div style={{ flex: 1, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => onEditClick(p)}>✎</button>
                  <button className="btn btn-danger-soft btn-sm" onClick={() => {
                    if (confirm(`Xóa người chơi "${p.name}"?`)) onDeleteClick(p)
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
