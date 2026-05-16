import SessionHistory from '../components/SessionHistory'

export default function SessionsPage({ sessions, expenseTypes, onViewSession, onDeleteSession, onNewSession, onSyncPlayers }) {
  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: 'space-between' }}>
        <span>📋 Lịch sử</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* <button className="btn btn-outline" onClick={onSyncPlayers}>🔁 Đồng bộ người chơi</button> */}
          <button className="btn btn-add" onClick={onNewSession}>
            ➕ Phiên đánh mới
          </button>
        </div>
      </div>
      <SessionHistory
        sessions={sessions}
        expenseTypes={expenseTypes}
        onView={onViewSession}
        onDelete={onDeleteSession}
      />
    </div>
  )
}
