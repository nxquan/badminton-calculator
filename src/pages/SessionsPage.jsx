import SessionHistory from '../components/SessionHistory'
import { Calendar, Plus } from 'lucide-react'

export default function SessionsPage({ sessions, expenseTypes, onViewSession, onDeleteSession, onNewSession }) {
  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={20} style={{ color: '#16A34A' }} /> Lịch sử các phiên cầu ({sessions.length})
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-add" onClick={onNewSession}>
            <Plus size={18} /> Phiên đánh mới
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

