import { useEffect, useId, useMemo, useState, useCallback } from 'react'
import { PLAYERS, COMBOS, DEFAULT_PAYER, formatMoney, calculateTotals, getEntryLabel, expenseTypeValueFromLabel, normalizeExpenseTypeLabel, sortExpenseTypes, sortPlayerNames } from '../constants'

function PeoplePicker({ selected, onToggle, names, onAddName }) {
  const [customName, setCustomName] = useState('')
  const nameListId = useId()
  const sortedNames = useMemo(() => sortPlayerNames(names), [names])
  const displayNames = useMemo(
    () => sortPlayerNames([...sortedNames, ...selected]),
    [sortedNames, selected]
  )
  const allSelected = sortedNames.length > 0 && sortedNames.every((p) => selected.includes(p))

  const isComboActive = (combo) =>
    combo.members.every((m) => selected.includes(m)) &&
    selected.every((s) => combo.members.includes(s))

  const handleAddCustomName = () => {
    const nextName = customName.trim()
    if (!nextName) return
    if (onAddName) {
      onAddName(nextName)
    }
    onToggle(sortPlayerNames([...selected, nextName]))
    setCustomName('')
  }

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

      <div className="form-row" style={{ marginBottom: '8px' }}>
        <div className="form-group" style={{ flex: '1 1 220px', minWidth: '180px' }}>
          <label>Thêm tên mới</label>
          <input
            type="text"
            list={nameListId}
            value={customName}
            placeholder="Nhập tên rồi bấm Thêm"
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddCustomName()
              }
            }}
          />
          <datalist id={nameListId}>
            {sortedNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <div className="form-group" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
          <label style={{ visibility: 'hidden' }}>Thêm</label>
          <button type="button" className="btn btn-outline btn-input-height" onClick={handleAddCustomName}>
            + Thêm tên
          </button>
        </div>
      </div>
    </div>
  )
}

function EntryForm({ onAdd, lastPeople, lastPayer, lastType, names, expenseTypes, onAddName, onAddExpenseType, onAdded }) {
  const [type, setType] = useState(lastType)
  const [customType, setCustomType] = useState('')
  const [hours, setHours] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [people, setPeople] = useState(lastPeople)
  const [payer, setPayer] = useState(lastPayer)
  const payerListId = useId()
  const typeListId = useId()
  const sortedTypes = useMemo(() => sortExpenseTypes(expenseTypes), [expenseTypes])

  const handleAddCustomType = () => {
    const nextLabel = normalizeExpenseTypeLabel(customType)
    if (!nextLabel) return
    const nextType = {
      value: expenseTypeValueFromLabel(nextLabel),
      label: nextLabel,
      emoji: '🧾',
    }
    if (onAddExpenseType) {
      onAddExpenseType(nextType)
    }
    setType(nextType.value)
    setCustomType('')
  }

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

    setHours('')
    setAmount('')
    setNote('')
    if (onAdded) {
      onAdded()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group" style={{ flex: '0 0 auto', minWidth: '150px' }}>
          <label>Loại chi phí</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
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

      <div className="form-row" style={{ marginTop: '-4px' }}>
        <div className="form-group" style={{ flex: '1 1 220px', minWidth: '180px' }}>
          <label>Thêm loại mới</label>
          <input
            type="text"
            list={typeListId}
            value={customType}
            placeholder="Nhập loại chi phí mới"
            onChange={(e) => setCustomType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddCustomType()
              }
            }}
          />
          <datalist id={typeListId}>
            {sortedTypes.map((t) => (
              <option key={t.value} value={t.label} />
            ))}
          </datalist>
        </div>
        <div className="form-group" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
          <label style={{ visibility: 'hidden' }}>Thêm loại</label>
          <button type="button" className="btn btn-outline btn-input-height" onClick={handleAddCustomType}>
            + Thêm loại
          </button>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: '0 0 auto', minWidth: '150px' }}>
          <label>Người trả</label>
          <input
            type="text"
            list={payerListId}
            value={payer}
            placeholder="Nhập hoặc chọn tên"
            onChange={(e) => setPayer(e.target.value)}
          />
          <datalist id={payerListId}>
            {sortPlayerNames([...names, ...people]).map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
          Người tham gia
        </label>
        <PeoplePicker selected={people} onToggle={setPeople} names={names} onAddName={onAddName} />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={!amount || Number(amount) <= 0 || people.length === 0 || (type === 'san' && (!hours || Number(hours) <= 0))}
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
  const payerListId = useId()
  const sortedTypes = useMemo(() => sortExpenseTypes(expenseTypes), [expenseTypes])
  const personNames = useMemo(() => sortPlayerNames([...names, payer, ...people]), [names, payer, people])

  useEffect(() => {
    setType(entry.type)
    setHours(entry.hours ? String(entry.hours) : '')
    setAmount(String(entry.amount))
    setNote(entry.note || '')
    setPayer(entry.payer)
    setPeople(entry.people)
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
          <select value={type} onChange={(e) => setType(e.target.value)}>
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
          <input
            type="text"
            list={payerListId}
            value={payer}
            placeholder="Nhập hoặc chọn tên"
            onChange={(e) => setPayer(e.target.value)}
          />
          <datalist id={payerListId}>
            {personNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
          Người tham gia
        </label>
        <PeoplePicker selected={people} onToggle={setPeople} names={names} onAddName={onAddName} />
      </div>

      <div className="actions-bar">
        <button type="button" className="btn btn-outline btn-surface-strong" onClick={onCancel}>
          Hủy
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!amount || Number(amount) <= 0 || people.length === 0 || (type === 'san' && (!hours || Number(hours) <= 0))}
        >
          ✓ Lưu thay đổi
        </button>
      </div>
    </form>
  )
}

export default function SessionForm({ session, names, expenseTypes, onAddPlayerName, onAddExpenseType, onSave, onCancel }) {
  const [date, setDate] = useState(session.date || new Date().toISOString().split('T')[0])
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

  return (
    <div>
      <div className="card">
        <div className="card-title">📅 Phiên đánh cầu</div>
        <div className="form-group">
          <label>Ngày đánh</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
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
                entries.map((entry) => {
                  const perPerson = entry.amount / entry.people.length
                  return (
                    <tr
                      key={entry.id}
                      className="entry-editable-row"
                    >
                      <td>
                        <span className={`type-badge ${entry.type}`}>
                          {getEntryLabel(entry, expenseTypes)}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{entry.payer}</td>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {formatMoney(entry.amount * 1000)}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {sortPlayerNames(entry.people).join(', ')}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--success)', fontWeight: 500, fontSize: '0.8rem' }}>
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
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000,
          }}
          onClick={() => setIsEntryModalOpen(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '860px', marginBottom: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-title" style={{ justifyContent: 'space-between' }}>
              <span>💰 Thêm khoản chi</span>
              <button className="btn btn-outline btn-surface-strong btn-sm" onClick={() => setIsEntryModalOpen(false)}>
                Đóng
              </button>
            </div>
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
              onAdded={() => setIsEntryModalOpen(false)}
            />
          </div>
        </div>
      )}

      {editingEntry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000,
          }}
          onClick={() => setEditingEntry(null)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '860px', marginBottom: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-title" style={{ justifyContent: 'space-between' }}>
              <span>✏️ Chỉnh sửa khoản chi</span>
              <button className="btn btn-outline btn-surface-strong btn-sm" onClick={() => setEditingEntry(null)}>
                Đóng
              </button>
            </div>
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
        >
          <span className="btn-icon" aria-hidden="true">✓</span>
          Lưu phiên đánh
        </button>
      </div>
    </div>
  )
}
