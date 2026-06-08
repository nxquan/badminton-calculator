import { useEffect, useMemo, useState, Fragment } from 'react'
import html2canvas from 'html2canvas'
import { formatMoney, calculateTotals, getEntryLabel, sortPlayerNames, sortExpenseTypes } from '../constants'

export default function SessionResult({ session, expenseTypes, onBack, onUpdateSession, onEditSession, players = [] }) {
  const idToName = Object.fromEntries((players || []).map((p) => [p.id, p.name]))

  const getId = (p) => {
    if (!p && p !== 0) return ''
    return typeof p === 'object' ? String(p.id) : String(p)
  }

  const getName = (p) => {
    if (!p && p !== 0) return ''
    if (typeof p === 'object') return p.name || String(p.id)
    return idToName[String(p)] || String(p)
  }

  // Normalize entries for UI: use names for calculations/display, include `{id,name}` objects, and prepare form entries with ids
  const normalizedEntries = (session.entries || []).map((e) => {
    // Ensure `people` is normalized to an array of `{id,name}` objects and an array of names
    const peopleObjs = (e.people || []).map((p) => (typeof p === 'object' ? { id: getId(p), name: getName(p) } : { id: getId(p), name: getName(p) }))
    const peopleNames = peopleObjs.map((p) => p.name)
    const peopleIds = peopleObjs.map((p) => p.id)
    const payerObj = typeof e.payer === 'object' ? { id: getId(e.payer), name: getName(e.payer) } : { id: getId(e.payer), name: getName(e.payer) }

    return {
      ...e,
      // for calculations and display we use names
      payer: payerObj.name,
      payerObj,
      // normalized people arrays for both object and name-based uses
      peopleObjs,
      people: peopleNames,
      // keep ids handy for editing
      _peopleIds: peopleIds,
      _payerId: payerObj.id,
    }
  })

  const totalsRaw = calculateTotals(normalizedEntries)
  // map totals keys (ids or names) to names
  const totals = Object.fromEntries(Object.entries(totalsRaw).map(([k, v]) => [(getName(k) || k), v]))
  const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0)
  const participants = sortPlayerNames(Object.keys(totals))
  const defaultTransferTo = useMemo(() => {
    const counts = {}
    for (const entry of normalizedEntries) {
      const payerName = entry?.payer || ''
      if (!payerName) continue
      counts[payerName] = (counts[payerName] || 0) + 1
    }

    const ranked = Object.entries(counts).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0], 'vi', { sensitivity: 'base' })
    })

    return ranked[0]?.[0] || participants[0] || ''
  }, [normalizedEntries, participants])
  const [activeResultTab, setActiveResultTab] = useState('entries')
  const [transferTo, setTransferTo] = useState(defaultTransferTo)
  const [settledPlayers, setSettledPlayers] = useState(session.settledPlayers || [])
  const [exportingImage, setExportingImage] = useState(false)

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

    setTransferTo(defaultTransferTo)
  }, [session.id, participants, defaultTransferTo])

  useEffect(() => {
    if (!participants.length) {
      setTransferTo('')
    } else if (transferTo && !participants.includes(transferTo)) {
      setTransferTo(defaultTransferTo || participants[0])
    }
  }, [participants, transferTo, defaultTransferTo])

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

    return [...normalizedEntries].sort((a, b) => {
      const ia = orderMap[a.type] ?? 9999
      const ib = orderMap[b.type] ?? 9999
      if (ia !== ib) return ia - ib
      return String(getEntryLabel(a, expenseTypes)).localeCompare(String(getEntryLabel(b, expenseTypes)), 'vi', { sensitivity: 'base' })
    })
  }, [normalizedEntries, expenseTypes])

  const playerColumns = useMemo(() => {
    const names = new Set()
    for (const entry of normalizedEntries) {
      for (const obj of (entry.people || [])) {
        names.add(obj)
      }
    }
    return sortPlayerNames([...names])
  }, [normalizedEntries, players])

  const nameToIdMap = Object.fromEntries((players || []).map((p) => [p.name, p.id]))
  const findIdByName = (name) => {
    if (nameToIdMap[name]) return nameToIdMap[name]
    for (const e of normalizedEntries) {
      for (const p of (e.peopleObjs || [])) {
        if ((p.name || p.id) === name) return p.id
      }
      if ((e.payerObj?.name || e.payerObj?.id) === name) return e.payerObj.id
    }
    return null
  }

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
  const canChangeTransferTo = canEditSession

  // Calculate breakdown by expense type for each person
  const expenseTypeBreakdown = useMemo(() => {
    const breakdown = {}
    for (const entry of normalizedEntries) {
      if (!breakdown[entry.type]) breakdown[entry.type] = {}
      const perPerson = entry.amount / (entry.people.length || 1)
      for (const personName of entry.people) {
        const name = personName || ''
        if (!breakdown[entry.type][name]) breakdown[entry.type][name] = 0
        breakdown[entry.type][name] += perPerson
      }
    }
    return breakdown
  }, [normalizedEntries, players])

  // Get all unique expense types sorted
  const allExpenseTypes = useMemo(() => {
    const typeSet = new Set(session.entries?.map(e => e.type) || [])
    const typeArray = [...typeSet].map(type => {
      const found = expenseTypes?.find(t => t.value === type)
      return found || { value: type, label: type, emoji: '' }
    })
    return sortExpenseTypes(typeArray)
  }, [session.entries, expenseTypes])

  // Total amount that should be transferred to `transferTo` (sum of positive owes)
  const transferTotal = useMemo(() => {
    if (!transferTo) return 0
    return Object.entries(totals).reduce((sum, [name, amount]) => {
      if (name === transferTo) return sum
      const paid = normalizedEntries
        .filter((entry) => entry.payer === name)
        .reduce((s, entry) => s + entry.amount, 0)
      const owe = amount - paid
      return sum + Math.max(0, owe)
    }, 0)
  }, [transferTo, totals, normalizedEntries])

  return (
    <div>
      <div className="result-top-actions">
        <button className="btn btn-outline" onClick={onBack}>
          ← Quay lại
        </button>
        {canEditSession && (
          <button
            className="btn btn-primary"
            style={{ marginLeft: 20 }}
            onClick={() => {
              const formEntries = normalizedEntries.map((e) => ({
                ...e,
                payer: e._payerId || getId(e.payerObj || e.payer),
                people: e._peopleIds || (e.peopleObjs || []).map((p) => p.id),
              }))
              onEditSession?.({ ...session, entries: formEntries })
            }}
          >
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
                              {entry?.payerObj?.name || entry?.payer || ''}
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
                                {playerColumns.map((name) => {
                                  const active = (entry.people || []).includes(name)
                                  return (
                                    <span
                                      key={name}
                                      style={{
                                        backgroundColor: active ? 'rgba(73, 101, 243, 0.2)' : 'transparent',
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
                                      {active ? name : ''}
                                    </span>
                                  )
                                })}
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
          <div className="card-title" style={{marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            💵 Kết quả chia tiền
            <div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={async () => {
                  const table = document.querySelector('.result-table-split')
                  if (!table) return
                  try {
                    setExportingImage(true)

                    // Clone table into a temporary wrapper with padding so exported image has 12px padding
                    const wrapper = document.createElement('div')
                    wrapper.style.background = '#ffffff'
                    wrapper.style.padding = '12px'
                    wrapper.style.display = 'inline-block'
                    // keep it off-screen to avoid layout shifts
                    wrapper.style.position = 'absolute'
                    wrapper.style.left = '-9999px'
                    wrapper.style.top = '0'

                    const clone = table.cloneNode(true)
                    // Ensure cloned table fills wrapper width similar to original
                    clone.style.maxWidth = '100%'

                    // Build header with requested info: Date, participants, total hours, shuttle count, cost
                    const header = document.createElement('div')
                    header.style.fontFamily = getComputedStyle(document.body).fontFamily || 'sans-serif'
                    header.style.color = 'black'
                    header.style.marginBottom = '8px'
                    header.style.display = 'flex'
                    header.style.flexDirection = 'column'
                    header.style.gap = '4px'

                    const hTitle = document.createElement('div')
                    hTitle.style.fontWeight = '700'
                    hTitle.style.fontSize = '16px'
                    hTitle.textContent = `Phiên: ${formattedDate}`
                    header.appendChild(hTitle)

                    const infoLine = document.createElement('div')
                    infoLine.style.display = 'flex'
                    infoLine.style.gap = '16px'
                    infoLine.style.alignItems = 'center'

                    const participantsCount = document.createElement('div')
                    participantsCount.textContent = `Số người tham gia: ${participants.length}`
                    infoLine.appendChild(participantsCount)

                    // total hours (sum of entry.hours)
                    const totalHours = (normalizedEntries || []).reduce((s, e) => s + (Number(e.hours) || 0), 0)
                    const hoursEl = document.createElement('div')
                    hoursEl.textContent = `Số giờ chơi: ${totalHours || '-'} `
                    infoLine.appendChild(hoursEl)

                    

                    // cost
                    const costEl = document.createElement('div')
                    costEl.textContent = `Chi phí: ${formatMoney(Math.round(grandTotal * 1000))}`
                    infoLine.appendChild(costEl)

                    header.appendChild(infoLine)

                    wrapper.appendChild(header)
                    wrapper.appendChild(clone)
                    document.body.appendChild(wrapper)

                    const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: null })
                    canvas.toBlob((blob) => {
                      try {
                        if (!blob) return
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        const dateStr = (session.date || new Date().toISOString().split('T')[0])
                        a.download = `badminton-result-${dateStr}.png`
                        a.click()
                        URL.revokeObjectURL(url)
                      } finally {
                        setExportingImage(false)
                        // clean up temporary wrapper
                        try { document.body.removeChild(wrapper) } catch (e) { /* ignore */ }
                      }
                    })
                  } catch (e) {
                    setExportingImage(false)
                    console.error('Export image error', e)
                  }
                }}
                disabled={exportingImage}
              >
                📤 Export Bill
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '4px' }}>
            <label
              style={{
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',

              }}
            >
              Chuyển tiền cho ai?
              {!canChangeTransferTo && (
              <div style={{ marginLeft: '6px', color: 'var(--color-error)', fontWeight: 600 }}>
                Đã có người thanh toán nên không thể đổi người chuyển tiền.
              </div>
            )}
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
            
            
          </div>

          <table className="result-table result-table-split">
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
                  const paid = normalizedEntries
                    .filter((entry) => entry.payer === name)
                    .reduce((sum, entry) => sum + entry.amount, 0)
                  const owe = amount - paid
                  const isSettled = settledPlayers.includes(name)
                  const canSettle = owe > 0

                  return (
                    <tr key={name} className={name === transferTo ? 'transfer-target-row' : ''}>
                      <td style={{ fontWeight: 600, color: 'var(--color-accent-dark)' }}>
                        {name}{' '}
                        {paid > 0 ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            (đã trả {formatMoney(Math.round(paid * 1000))})
                          </span>
                        ) : null}
                      </td>
                      <td style={{color: 'red', fontWeight: 600}}>{formatMoney(Math.round(amount * 1000))}</td>
                      {allExpenseTypes.map((type) => {
                        const typeAmount = expenseTypeBreakdown[type.value]?.[name] || 0
                        return (
                          <td key={type.value} style={{ fontSize: '1rem', fontWeight: 500 }}>
                            {typeAmount > 0 ? formatMoney(Math.round(typeAmount * 1000)) : '-'}
                          </td>
                        )
                      })}
                      {transferTo && (
                        <td>
                          {name === transferTo ? (
                            transferTotal > 0 ? (
                              <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                                Được nhận {formatMoney(Math.round(transferTotal * 1000))}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)' }}>—</span>
                            )
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
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Paid</span>
                          ) : (
                            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Pending</span>
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
                {transferTo && (
                  <td style={{ fontWeight: 600 }}>
                    {transferTotal > 0 ? formatMoney(Math.round(transferTotal * 1000)) : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                  </td>
                )}
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
