import { useEffect, useId, useMemo, useState, useCallback, useRef, Fragment } from 'react'
import { PLAYERS, COMBOS, DEFAULT_PAYER, formatMoney, calculateTotals, getEntryLabel, sortExpenseTypes, sortPlayerNames } from '../constants'

function PeoplePicker({ selected, onToggle, names, onAddName, customName, onCustomNameChange }) {
  const sortedNames = useMemo(() => sortPlayerNames(names), [names])
  const displayNames = useMemo(
    () => sortPlayerNames([...sortedNames, ...selected]),
    [sortedNames, selected]
  )
  const allSelected = sortedNames.length > 0 && sortedNames.every((p) => selected.includes(p))

  const isComboActive = (combo) =>
    combo.members.every((m) => selected.includes(m)) &&
    selected.every((s) => combo.members.includes(s))

  const handleCombo = (combo) => {
    onToggle(isComboActive(combo) ? [] : [...combo.members])
  }

  return (
    <div>
      <div className="select-actions">
        {COMBOS.map((combo) => (
          <button
            key={combo.label}
            type="button"
            className={`btn btn-sm ${isComboActive(combo) ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleCombo(combo)}
          >
            {combo.emoji} {combo.label}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => {
            const next = allSelected ? [] : [...sortedNames]
            onToggle(next)
          }}
        >
          {allSelected ? 'Bỏ tất cả' : 'Tất cả'}
        </button>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
          {selected.length} người
        </span>
      </div>
      
      <div className="people-picker">
        {displayNames.map((name) => (
          <button
            key={name}
            type="button"
            className={`people-chip ${selected.includes(name) ? 'selected' : ''}`}
            onClick={() => {
              const next = selected.includes(name)
                ? selected.filter((n) => n !== name)
                : [...selected, name]
              onToggle(next)
            }}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}


function EntryForm({ onAdd, lastPeople, lastPayer, lastType, names, expenseTypes, onAddName, onAddExpenseType, onAdded }) {
  const [type, setType] = useState(lastType)
  const [hours, setHours] = useState(type === 'san' ? '2' : '')
  const [amount, setAmount] = useState(type === 'san' ? 240 : '')
  const [note, setNote] = useState('')
  const [people, setPeople] = useState(lastPeople)
  const [payer, setPayer] = useState(lastPayer)
  const sortedTypes = useMemo(() => sortExpenseTypes(expenseTypes), [expenseTypes])

  const handleSubmit = (e) => {
    e.preventDefault()
    const numAmount = Number(amount)
    const numHours = Number(hours)
    if (numAmount <= 0 || people.length === 0) return
    if (type === 'san' && numHours <= 0) return

    onAdd({
      id: crypto.randomUUID(),
      type,
      amount: numAmount,
      hours: type === 'san' ? numHours : undefined,
      note: note.trim(),
      payer,
      people: [...people],
    })

    setHours(type === 'san' ? '2' : '')
    setAmount(type === 'san' ? 240 : '')
    setNote('')
    setPayer(lastPayer)
    setPeople(['san', 'cau', 'tra-da'].includes(type) ? people : [])
    if (onAdded) {
      onAdded()
    }
  }



  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group" style={{ flex: '0 0 auto', minWidth: '150px' }}>
          <label>Loại chi phí</label>
          <select value={type} onChange={(e) => {
            const newType = e.target.value
            setType(newType)
            if (newType === 'san') {
              setHours('2')
              setAmount('240')
            } else {
              setHours('') 
              setAmount('')
            }
            
            // Reset people if type is not one of the main types
            if (!['san', 'cau', 'tra-da'].includes(newType)) {
              setPeople([])
            }
          }}>
            {sortedTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.emoji || '🧾'} {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ flex: '0 0 auto', minWidth: '140px' }}>
          <label>Số tiền (nghìn đồng)</label>
          <input
            type="number"
            min="1"
            step="1"
            placeholder="VD: 240"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        {type === 'san' && (
          <div className="form-group" style={{ flex: '0 0 auto', minWidth: '120px' }}>
            <label>Số giờ</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              placeholder="VD: 2"
              value={hours ?? 2}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
        )}
        <div className="form-group" style={{ flex: '1 1 auto', minWidth: '140px' }}>
          <label>Ghi chú (tuỳ chọn)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>



      <div className="form-row">
        <div className="form-group" style={{ flex: '0 0 auto', minWidth: '150px' }}>
          <label>Người trả</label>
          <select value={payer} onChange={(e) => setPayer(e.target.value)}>
            <option value="">-- Chọn người trả --</option>
            {sortPlayerNames([...names, ...people]).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
          Người tham gia
        </label>
        <PeoplePicker 
          selected={people} 
          onToggle={setPeople} 
          names={names} 
          onAddName={onAddName}
          customName=""
          onCustomNameChange={() => {}}
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={!amount || Number(amount) <= 0 || people.length === 0 || (type === 'san' && (!hours || Number(hours) <= 0))}
        style={{ opacity: (!amount || Number(amount) <= 0 || people.length === 0 || (type === 'san' && (!hours || Number(hours) <= 0))) ? 0.5 : 1 }}
      >
        Thêm khoản chi
        {amount && people.length > 0 && (
          <span style={{ opacity: 0.8, fontSize: '0.8rem' }}>
            ({formatMoney(Math.round(Number(amount) * 1000 / people.length))}/người)
          </span>
        )}
      </button>
    </form>
  )
}

function EditEntryForm({ entry, names, expenseTypes, onAddName, onSave, onCancel }) {
  const [type, setType] = useState(entry.type)
  const [hours, setHours] = useState(entry.hours ? String(entry.hours) : '')
  const [amount, setAmount] = useState(String(entry.amount))
  const [note, setNote] = useState(entry.note || '')
  const [payer, setPayer] = useState(entry.payer)
  const [people, setPeople] = useState(entry.people)
  const [customName, setCustomName] = useState('')
  const sortedTypes = useMemo(() => sortExpenseTypes(expenseTypes), [expenseTypes])
  const personNames = useMemo(() => sortPlayerNames([...names, payer, ...people]), [names, payer, people])

  useEffect(() => {
    setType(entry.type)
    setHours(entry.hours ? String(entry.hours) : '')
    setAmount(String(entry.amount))
    setNote(entry.note || '')
    setPayer(entry.payer)
    setPeople(entry.people)
    setCustomName('')
  }, [entry])

  const handleSubmit = (e) => {
    e.preventDefault()
    const numAmount = Number(amount)
    const numHours = Number(hours)
    if (numAmount <= 0 || people.length === 0) return
    if (type === 'san' && numHours <= 0) return

    onSave({
      ...entry,
      type,
      amount: numAmount,
      hours: type === 'san' ? numHours : undefined,
      note: note.trim(),
      payer,
      people: [...people],
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group" style={{ flex: '0 0 auto', minWidth: '150px' }}>
          <label>Loại chi phí</label>
          <select value={type} onChange={(e) => {
            const newType = e.target.value
            setType(newType)
            
            // Reset people if type is not one of the main types
            if (!['san', 'cau', 'tra-da'].includes(newType)) {
              setPeople([])
            }
          }}>
            {sortedTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.emoji || '🧾'} {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ flex: '0 0 auto', minWidth: '140px' }}>
          <label>Số tiền (nghìn đồng)</label>
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        {type === 'san' && (
          <div className="form-group" style={{ flex: '0 0 auto', minWidth: '120px' }}>
            <label>Số giờ</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
        )}
        <div className="form-group" style={{ flex: '1 1 auto', minWidth: '140px' }}>
          <label>Ghi chú (tuỳ chọn)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: '0 0 auto', minWidth: '150px' }}>
          <label>Người trả</label>
          <select value={payer} onChange={(e) => setPayer(e.target.value)}>
            <option value="">-- Chọn người trả --</option>
            {personNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
          Người tham gia
        </label>
        <PeoplePicker selected={people} onToggle={setPeople} names={names} onAddName={onAddName} customName={customName} onCustomNameChange={setCustomName} />
      </div>

      <div className="actions-bar">
        <button type="button" className="btn btn-outline btn-surface-strong" onClick={onCancel}>
          Hủy
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!amount || Number(amount) <= 0 || people.length === 0 || (type === 'san' && (!hours || Number(hours) <= 0))}
          style={{ opacity: (!amount || Number(amount) <= 0 || people.length === 0 || (type === 'san' && (!hours || Number(hours) <= 0))) ? 0.5 : 1 }}
        >
          ✓ Lưu thay đổi
        </button>
      </div>
    </form>
  )
}

export default function SessionForm({ session, names, expenseTypes, onAddPlayerName, onAddExpenseType, onSave, onCancel }) {
  const [date, setDate] = useState(session.date || new Date().toISOString().split('T')[0])
  const dateInputId = useId()
  const [entries, setEntries] = useState(session.entries || [])
  const [editingEntry, setEditingEntry] = useState(null)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)
  const [lastPeople, setLastPeople] = useState([])
  const [lastPayer, setLastPayer] = useState(DEFAULT_PAYER)
  const [lastType, setLastType] = useState('san')

  const handleAddEntry = useCallback((entry) => {
    setLastPeople(entry.people)
    setLastPayer(entry.payer)
    setLastType(entry.type)
    setEntries((prev) => [...prev, entry])
  }, [])

  const handleUpdateEntry = useCallback((updated) => {
    setEntries((prev) => prev.map((e) => e.id === updated.id ? updated : e))
    setEditingEntry(null)
  }, [])

  const handleRemoveEntry = useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const handleSave = () => {
    if (entries.length === 0) return
    onSave({
      ...session,
      date,
      entries,
      createdAt: session.createdAt || new Date().toISOString(),
    })
  }

  const totals = calculateTotals(entries)
  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)
  const playerNames = useMemo(
    () => sortPlayerNames([...names, ...entries.flatMap((entry) => [entry.payer, ...(entry.people || [])])]),
    [entries, names]
  )
  const playerColumns = useMemo(
    () => sortPlayerNames([...new Set([...names, ...entries.flatMap((entry) => entry.people || [])])]),
    [entries, names]
  )

  const sortedEntries = useMemo(() => {
    const orderMap = sortExpenseTypes(expenseTypes || []).reduce((m, t, i) => {
      m[t.value] = i
      return m
    }, {})

    return [...entries].sort((a, b) => {
      const ia = orderMap[a.type] ?? 9999
      const ib = orderMap[b.type] ?? 9999
      if (ia !== ib) return ia - ib
      return String(getEntryLabel(a, expenseTypes)).localeCompare(String(getEntryLabel(b, expenseTypes)), 'vi', { sensitivity: 'base' })
    })
  }, [entries, expenseTypes])

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

  function formatDisplayDate(iso) {
    if (!iso) return ''
    try {
      const [y, m, d] = String(iso).split('-')
      if (!d || !m || !y) return iso
      // const yy = String(y).slice(2)
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
    } catch (e) {
      return iso
    }
  }

  function DateField({ id, value, onChange }) {
    const inputRef = useRef(null)

    const openPicker = () => {
      const el = inputRef.current
      if (!el) return
      // Prefer showPicker() if available (Chromium)
      if (typeof el.showPicker === 'function') {
        try {
          el.showPicker()
          return
        } catch (e) {
          // ignore and fallback to focus
        }
      }
      // Fallback to focus which should open picker on most browsers
      try {
        el.focus()
        // For some browsers, sending a click helps
        el.click()
      } catch (e) {
        /* ignore */
      }
    }

    return (
      <div className="form-group" style={{ position: 'relative', display: 'inline-block' }}>
        <label htmlFor={id} style={{ display: 'block', cursor: 'pointer' }}>Ngày đánh</label>
        <div
          onClick={openPicker}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker() } }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--surface-weak)',
            background: 'var(--bg-surface)',
            minWidth: '160px',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <span style={{ fontSize: '0.95rem' }}>{formatDisplayDate(value) || 'Chọn ngày'}</span>
          <span style={{ marginLeft: 'auto', opacity: 0.7 }}>📅</span>

          <input
            ref={inputRef}
            id={id}
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              border: 'none',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              zIndex: 3,
              background: 'transparent',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
            }}
            aria-label="Chọn ngày"
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">📅 Phiên đánh cầu</div>
        <DateField id={dateInputId} value={date} onChange={setDate} />
      </div>

      <div className="card">
        <div className="card-title">💰 Thêm khoản chi</div>
        <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => setIsEntryModalOpen(true)}>
          + Thêm khoản chi
        </button>
      </div>

      <div className="card">
        <div className="card-title">
          📋 Danh sách chi phí ({entries.length} khoản)
        </div>
        <div className="table-wrap">
          <table className="result-table">
            <colgroup>
              <col style={{ width: '88px' }} />
              <col style={{ width: '92px' }} />
              <col style={{ width: '92px' }} />
              <col />
              <col style={{ width: '84px' }} />
              <col style={{ width: '72px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Khoản</th>
                <th>Người trả</th>
                <th>Số tiền</th>
                <th>Người chơi</th>
                <th>/người</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Chưa có khoản chi nào.
                  </td>
                </tr>
              ) : (
                groupedEntries.map((group, groupIndex) => {
                  return (
                    <Fragment key={group.type}>
                      {group.items.map((entry, itemIndex) => {
                        const perPerson = entry.amount / entry.people.length
                        const isFirstInGroup = itemIndex === 0
                        const bgColor = groupIndex % 2 === 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.5)'
                        const borderTop = isFirstInGroup ? '1px solid rgba(59, 130, 246, 1)' : 'none'

                        return (
                          <tr
                            key={entry.id}
                            className="entry-editable-row"
                            style={{ backgroundColor: bgColor, borderTop }}
                          >
                            <td>
                              <span className={`type-badge ${entry.type}`}>
                                {getEntryLabel(entry, expenseTypes)}
                              </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {entry.payer}
                            </td>
                            <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                              {formatMoney(entry.amount * 1000)}
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'rgb(73, 101, 243)', minWidth: 0 }}>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: `repeat(${Math.max(playerColumns.length, 1)}, minmax(42px, 1fr))`,
                                  gap: '1px',
                                  width: '100%',
                                }}
                              >
                                {playerColumns.map((name) => (
                                  <span
                                    key={name}
                                    style={{
                                      backgroundColor: entry.people.includes(name) ? 'rgba(73, 101, 243, 0.2)' : 'transparent',
                                      padding: '1px 3px',
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
                            <td>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => setEditingEntry(entry)}
                                >
                                  ✎
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleRemoveEntry(entry.id)}
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">📊 Tạm tính</div>
        <table className="result-table">
          <thead>
            <tr>
              <th>Người chơi</th>
              <th>Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(totals).length === 0 ? (
              <tr>
                <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Chưa có dữ liệu tạm tính.
                </td>
              </tr>
            ) : (
              <>
                {Object.entries(totals)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, amount]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{formatMoney(Math.round(amount * 1000))}</td>
                    </tr>
                  ))}
                <tr className="result-total">
                  <td>Tổng cộng</td>
                  <td>{formatMoney(Math.round(grandTotal * 1000))}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {isEntryModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '860px',
              marginBottom: 0,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-title" style={{ justifyContent: 'space-between', flexShrink: 0 }}>
              <span>💰 Thêm khoản chi</span>
              <button className="btn btn-outline btn-surface-strong btn-sm" onClick={() => setIsEntryModalOpen(false)}>
                Đóng
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', paddingBottom: '16px' }}>
              <EntryForm
                key={entries.length}
                onAdd={handleAddEntry}
                lastPeople={lastPeople}
                lastPayer={lastPayer}
                lastType={lastType}
                names={playerNames}
                expenseTypes={expenseTypes}
                onAddName={onAddPlayerName}
                onAddExpenseType={onAddExpenseType}
              />
            </div>
          </div>
        </div>
      )}

      {editingEntry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '860px',
              marginBottom: 0,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-title" style={{ justifyContent: 'space-between', flexShrink: 0 }}>
              <span>✏️ Chỉnh sửa khoản chi</span>
              <button className="btn btn-outline btn-surface-strong btn-sm" onClick={() => setEditingEntry(null)}>
                Đóng
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', paddingBottom: '16px' }}>
              <EditEntryForm
                entry={editingEntry}
                names={playerNames}
                expenseTypes={expenseTypes}
                onAddName={onAddPlayerName}
                onSave={handleUpdateEntry}
                onCancel={() => setEditingEntry(null)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="actions-bar" style={{ marginTop: '8px' }}>
        <button className="btn btn-outline btn-surface-strong" onClick={onCancel}>
          <span className="btn-icon" aria-hidden="true">↩</span>
          Quay lại
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={entries.length === 0}
          style={{ opacity: entries.length === 0 ? 0.5 : 1 }}
        >
          <span className="btn-icon" aria-hidden="true">✓</span>
          Lưu phiên đánh
        </button>
      </div>
    </div>
  )
}
