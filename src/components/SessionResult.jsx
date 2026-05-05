import { useEffect, useMemo, useState } from 'react'
import { formatMoney, calculateTotals, getEntryLabel, sortPlayerNames } from '../constants'

export default function SessionResult({ session, expenseTypes, onBack, onUpdateSession, onEditSession }) {
  const totals = calculateTotals(session.entries)
  const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0)
  const participants = sortPlayerNames(Object.keys(totals))
  const [activeResultTab, setActiveResultTab] = useState('entries')
  const [transferTo, setTransferTo] = useState(participants[0] || '')
  const [settledPlayers, setSettledPlayers] = useState(session.settledPlayers || [])

  useEffect(() => {
    setSettledPlayers(session.settledPlayers || [])
  }, [session])

  const canEditSession = useMemo(
    () => participants.every((name) => !settledPlayers.includes(name)),
    [participants, settledPlayers]
  )

  useEffect(() => {
    setTransferTo(participants[0] || '')
  }, [session.id])

  useEffect(() => {
    if (!participants.length) {
      setTransferTo('')
      return
    }

    if (!transferTo || !participants.includes(transferTo)) {
      setTransferTo(participants[0])
    }
  }, [participants, transferTo])

  const handleToggleSettled = (name) => {
    const nextSettled = settledPlayers.includes(name)
      ? settledPlayers.filter((player) => player !== name)
      : [...settledPlayers, name]

    setSettledPlayers(nextSettled)
    if (onUpdateSession) {
      onUpdateSession({
        ...session,
        settledPlayers: nextSettled,
      })
    }
  }

  const formattedDate = new Date(session.date).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div>
      <div className="result-top-actions">
        <button className="btn btn-outline" onClick={onBack}>
          ← Quay lại
        </button>
        {canEditSession && (
          <button className="btn btn-primary" onClick={() => onEditSession?.(session)}>
            ✎ Chỉnh sửa phiên
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-title">📅 {formattedDate}</div>
      </div>

      <div className="tab-bar">
        <button
          type="button"
          className={`tab-btn ${activeResultTab === 'entries' ? 'active' : ''}`}
          onClick={() => setActiveResultTab('entries')}
        >
          📋 Chi tiết khoản chi
        </button>
        <button
          type="button"
          className={`tab-btn ${activeResultTab === 'split' ? 'active' : ''}`}
          onClick={() => setActiveResultTab('split')}
        >
          💵 Kết quả chia tiền
        </button>
      </div>

      {activeResultTab === 'entries' && (
        <div className="card">
          <div className="card-title">📋 Chi tiết khoản chi</div>

          <div className="table-wrap">
            <table className="result-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>Khoản</th>
                  <th>Người trả</th>
                  <th>Số tiền</th>
                  <th>Người chơi</th>
                  <th>/người</th>
                </tr>
              </thead>
              <tbody>
                {session.entries.map((entry) => {
                  const perPerson = entry.amount / entry.people.length
                  return (
                    <tr key={entry.id}>
                      <td>
                        <span className={`type-badge ${entry.type}`}>
                          {getEntryLabel(entry, expenseTypes)}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{entry.payer || 'Trí'}</td>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {formatMoney(entry.amount * 1000)}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {sortPlayerNames(entry.people).join(', ')}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--success)', fontWeight: 500, fontSize: '0.8rem' }}>
                        {formatMoney(Math.round(perPerson * 1000))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeResultTab === 'split' && (
        <div className="card">
          <div className="card-title">💵 Kết quả chia tiền</div>

          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '4px',
                display: 'block',
              }}
            >
              Chuyển tiền cho ai?
            </label>
            <div className="people-picker">
              {participants.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`people-chip ${transferTo === name ? 'selected' : ''}`}
                  onClick={() => setTransferTo(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <table className="result-table">
            <thead>
              <tr>
                <th>Người chơi</th>
                <th>Phải trả</th>
                {transferTo && <th>Chuyển cho {transferTo}</th>}
                <th>Trạng thái</th>
                <th>Đánh dấu</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(totals)
                .sort((a, b) => b[1] - a[1])
                .map(([name, amount]) => {
                  const paid = session.entries
                    .filter((entry) => (entry.payer || 'Trí') === name)
                    .reduce((sum, entry) => sum + entry.amount, 0)
                  const owe = amount - paid
                  const isSettled = settledPlayers.includes(name)
                  const canSettle = owe > 0

                  return (
                    <tr key={name} className={name === transferTo ? 'transfer-target-row' : ''}>
                      <td>
                        {name}{' '}
                        {paid > 0 ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            (đã trả {formatMoney(Math.round(paid * 1000))})
                          </span>
                        ) : null}
                      </td>
                      <td>{formatMoney(Math.round(amount * 1000))}</td>
                      {transferTo && (
                        <td>
                          {name === transferTo ? (
                            <span style={{ color: 'var(--text-secondary)' }}>—</span>
                          ) : owe > 0 ? (
                            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                              {formatMoney(Math.round(owe * 1000))}
                            </span>
                          ) : owe < 0 ? (
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                              Được nhận {formatMoney(Math.round(Math.abs(owe) * 1000))}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--success)' }}>✓ Đã hòa</span>
                          )}
                        </td>
                      )}
                      <td>
                        {canSettle ? (
                          isSettled ? (
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Đã thanh toán</span>
                          ) : (
                            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Chưa thanh toán</span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {canSettle ? (
                          <label className="settle-toggle" aria-label={`Đánh dấu ${name} đã thanh toán`}>
                            <input
                              type="checkbox"
                              className="settle-toggle-input"
                              checked={isSettled}
                              onChange={() => handleToggleSettled(name)}
                            />
                            <span className="settle-toggle-box" aria-hidden="true">
                              ✓
                            </span>
                          </label>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              <tr className="result-total">
                <td>Tổng cộng</td>
                <td>{formatMoney(Math.round(grandTotal * 1000))}</td>
                {transferTo && <td />}
                <td />
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
