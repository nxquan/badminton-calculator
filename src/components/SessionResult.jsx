import { useEffect, useMemo, useState, Fragment } from 'react'
import { formatMoney, calculateTotals, getEntryLabel, sortPlayerNames, sortExpenseTypes } from '../constants'

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

  // Persist `transferTo` per session in localStorage so user's choice isn't reset
  useEffect(() => {
    const key = `session.transferTo.${session.id}`
    // Priority: session.transferTo (from DB) -> localStorage -> default participant
    if (session.transferTo && participants.includes(session.transferTo)) {
      setTransferTo(session.transferTo)
      return
    }

    try {
      const stored = localStorage.getItem(key)
      if (stored && participants.includes(stored)) {
        setTransferTo(stored)
        return
      }
    } catch (e) {
      // ignore
    }

    setTransferTo(participants[0] || '')
  }, [session.id, participants])

  useEffect(() => {
    if (!participants.length) {
      setTransferTo('')
    } else if (transferTo && !participants.includes(transferTo)) {
      setTransferTo(participants[0])
    }
  }, [participants])

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

  const handleSetTransferTo = (name) => {
    if (!canChangeTransferTo) return
    setTransferTo(name)
    try {
      localStorage.setItem(`session.transferTo.${session.id}`, name)
    } catch (e) {
      // ignore
    }

    if (onUpdateSession) {
      onUpdateSession({ ...session, transferTo: name })
    }
  }

  const formattedDate = new Date(session.date).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const sortedEntries = useMemo(() => {
    const orderMap = sortExpenseTypes(expenseTypes || []).reduce((m, t, i) => {
      m[t.value] = i
      return m
    }, {})

    return [...(session.entries || [])].sort((a, b) => {
      const ia = orderMap[a.type] ?? 9999
      const ib = orderMap[b.type] ?? 9999
      if (ia !== ib) return ia - ib
      return String(getEntryLabel(a, expenseTypes)).localeCompare(String(getEntryLabel(b, expenseTypes)), 'vi', { sensitivity: 'base' })
    })
  }, [session.entries, expenseTypes])

  const playerColumns = useMemo(
    () => sortPlayerNames([...new Set((session.entries || []).flatMap((entry) => entry.people || []))]),
    [session.entries]
  )

  const groupedEntries = useMemo(() => {
    const groups = {}
    sortedEntries.forEach((entry) => {
      if (!groups[entry.type]) {
        groups[entry.type] = []
      }
      groups[entry.type].push(entry)
    })
    return Object.entries(groups).map(([type, items]) => ({ type, items }))
  }, [sortedEntries])
  const canChangeTransferTo = settledPlayers.length === 0

  // Calculate breakdown by expense type for each person
  const expenseTypeBreakdown = useMemo(() => {
    const breakdown = {}
    for (const entry of session.entries || []) {
      if (!breakdown[entry.type]) breakdown[entry.type] = {}
      const perPerson = entry.amount / entry.people.length
      for (const person of entry.people) {
        if (!breakdown[entry.type][person]) breakdown[entry.type][person] = 0
        breakdown[entry.type][person] += perPerson
      }
    }
    return breakdown
  }, [session.entries])

  // Get all unique expense types sorted
  const allExpenseTypes = useMemo(() => {
    const typeSet = new Set(session.entries?.map(e => e.type) || [])
    const typeArray = [...typeSet].map(type => {
      const found = expenseTypes?.find(t => t.value === type)
      return found || { value: type, label: type, emoji: '' }
    })
    return sortExpenseTypes(typeArray)
  }, [session.entries, expenseTypes])

  return (
    <div>
      <div className="result-top-actions">
        <button className="btn btn-outline" onClick={onBack}>
          ← Quay lại
        </button>
        {canEditSession && (
          <button className="btn btn-primary" style={{ marginLeft: 20 }} onClick={() => onEditSession?.(session)}>
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
            <table className="result-table" style={{ marginBottom: 0, tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '240px' }} />
                <col style={{ width: '60px' }} />
                <col style={{ width: '80px' }} />
                <col />
                <col style={{ width: '80px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Khoản</th>
                  <th style={{textAlign: 'center'}}>Người trả</th>
                  <th style={{textAlign: 'right'}}>Số tiền</th>
                  <th style={{textAlign: 'center'}}>Người chơi</th>
                  <th style={{textAlign: 'right'}}>/người</th>
                </tr>
              </thead>
              <tbody>
                {groupedEntries.map((group, groupIndex) => {
                  return (
                    <Fragment key={group.type}>
                      {group.items.map((entry, itemIndex) => {
                        const perPerson = entry.amount / entry.people.length
                        const isFirstInGroup = itemIndex === 0
                        const bgColor = groupIndex % 2 === 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.5)'
                        const borderTop = isFirstInGroup ? '1px solid rgba(59, 130, 246, 1)' : 'none'

                        return (
                          <tr key={entry.id} style={{ backgroundColor: bgColor, borderTop }}>
                            <td>
                              <span className={`type-badge ${entry.type}`}>
                                {getEntryLabel(entry, expenseTypes)}
                              </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {entry.payer || 'Trí'}
                            </td>
                            <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                              {formatMoney(entry.amount * 1000)}
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'rgb(73, 101, 243)', minWidth: 0 }}>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: `repeat(${Math.max(playerColumns.length, 1)}, minmax(42px, 1fr))`,
                                  gap: '12px',
                                  width: '100%',
                                }}
                              >
                                {playerColumns.map((name) => (
                                  <span
                                    key={name}
                                    style={{
                                      backgroundColor: entry.people.includes(name) ? 'rgba(73, 101, 243, 0.2)' : 'transparent',
                                      padding: '2px',
                                      borderRadius: '3px',
                                      fontWeight: 500,
                                      fontSize: '0.7rem',
                                      whiteSpace: 'nowrap',
                                      textAlign: 'center',
                                      minHeight: '18px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    {entry.people.includes(name) ? name : ''}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td style={{ whiteSpace: 'nowrap', color: 'var(--success)', fontWeight: 600, fontSize: '0.8rem' }}>
                              {formatMoney(Math.round(perPerson * 1000))}
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
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
                  disabled={!canChangeTransferTo}
                  onClick={() => handleSetTransferTo(name)}
                >
                  {name}
                </button>
              ))}
            </div>
            {!canChangeTransferTo && (
              <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Đã có người thanh toán nên không thể đổi người chuyển tiền.
              </div>
            )}
          </div>

          <table className="result-table">
            <thead>
              <tr>
                <th>Người chơi</th>
                <th>Phải trả</th>
                {allExpenseTypes.map((type) => (
                  <th key={type.value} style={{ fontSize: '0.9rem' }}>
                    {type.emoji} {type.label}
                  </th>
                ))}
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
                      {allExpenseTypes.map((type) => {
                        const typeAmount = expenseTypeBreakdown[type.value]?.[name] || 0
                        return (
                          <td key={type.value} style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            {typeAmount > 0 ? formatMoney(Math.round(typeAmount * 1000)) : '-'}
                          </td>
                        )
                      })}
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
                {allExpenseTypes.map((type) => {
                  const typeTotal = Object.values(expenseTypeBreakdown[type.value] || {}).reduce((s, v) => s + v, 0)
                  return (
                    <td key={type.value} style={{ fontWeight: 600 }}>
                      {formatMoney(Math.round(typeTotal * 1000))}
                    </td>
                  )
                })}
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
