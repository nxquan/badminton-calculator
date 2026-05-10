import SessionHistory from '../components/SessionHistory'

export default function SessionsPage({ sessions, expenseTypes, onViewSession, onDeleteSession, onNewSession }) {
  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: 'space-between' }}>
        <span>📋 Lịch sử</span>
        <button className="btn btn-add" onClick={onNewSession}>
          ➕ Phiên đánh mới
        </button>
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
