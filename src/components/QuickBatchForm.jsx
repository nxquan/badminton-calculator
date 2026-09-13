import { useState, useMemo, useCallback } from 'react'
import { sortExpenseTypes, DEFAULT_EXPENSE_TYPES, formatMoney } from '../constants'
import PlayerAvatar from './PlayerAvatar'

function MiniPeoplePicker({ selected, onToggle, players = [], badmintonPlayers = [] }) {
  const sortedPlayers = useMemo(() => players.slice().sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })), [players])
  const targetBadminton = (badmintonPlayers && badmintonPlayers.length > 0) ? badmintonPlayers : sortedPlayers.map(p => p.id)
  const isBadmintonActive = targetBadminton.length > 0 && targetBadminton.every(id => selected.includes(id)) && selected.every(id => targetBadminton.includes(id))
  const allSelected = sortedPlayers.length > 0 && sortedPlayers.every((p) => selected.includes(p.id))

  const togglePlayer = (id) => {
    if (selected.includes(id)) {
      onToggle(selected.filter((item) => item !== id))
    } else {
      onToggle([...selected, id])
    }
  }

  return (
    <div style={{ padding: '10px 12px', background: 'var(--color-court-green-soft)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-court-green-dark)' }}>
          👥 Chọn người tham gia khoản này ({selected.length} người):
        </span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            type="button"
            className={`btn btn-sm ${isBadmintonActive ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '2px 8px', fontSize: '0.72rem', background: isBadmintonActive ? undefined : 'var(--card-bg)' }}
            onClick={() => onToggle(isBadmintonActive ? [] : [...targetBadminton])}
          >
            🏸 Tham gia chơi cầu
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ padding: '2px 8px', fontSize: '0.72rem', background: 'var(--card-bg)' }}
            onClick={() => onToggle(allSelected ? [] : sortedPlayers.map((p) => p.id))}
          >
            {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {sortedPlayers.map((p) => {
          const isSelected = selected.includes(p.id)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => togglePlayer(p.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: isSelected ? 'var(--card-bg)' : 'rgba(255, 255, 255, 0.6)',
                color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: isSelected ? 700 : 400,
                cursor: 'pointer',
                boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <PlayerAvatar player={p} size={16} />
              <span>{p.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function QuickBatchForm({
  defaultPayer,
  defaultPeople,
  players = [],
  expenseTypes = DEFAULT_EXPENSE_TYPES,
  badmintonPlayers = [],
  onApplyEntries,
}) {
  const sortedTypes = useMemo(() => sortExpenseTypes(expenseTypes), [expenseTypes])

  const [rows, setRows] = useState([
    {
      id: 'san',
      type: 'san',
      enabled: true,
      amount: '240',
      hours: '2',
      note: '',
      customPayer: '',
      customPeople: null,
      showOverride: false,
    },
    {
      id: 'cau',
      type: 'cau',
      enabled: true,
      amount: '160',
      hours: '',
      note: '',
      customPayer: '',
      customPeople: null,
      showOverride: false,
    },
    {
      id: 'tra-da',
      type: 'tra-da',
      enabled: true,
      amount: '30',
      hours: '',
      note: '',
      customPayer: '',
      customPeople: null,
      showOverride: false,
    },
  ])

  const updateRow = useCallback((id, fields) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)))
  }, [])

  const addCustomRow = useCallback(() => {
    const nextType = sortedTypes.find((t) => !rows.some((r) => r.type === t.value))?.value || 'com'
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: nextType,
        enabled: true,
        amount: '',
        hours: '',
        note: '',
        customPayer: '',
        customPeople: null,
        showOverride: false,
      },
    ])
  }, [rows, sortedTypes])

  const removeRow = useCallback((id) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const activeEntries = useMemo(() => {
    return rows
      .filter((r) => r.enabled && Number(r.amount) > 0)
      .map((r) => {
        const payer = r.customPayer || defaultPayer
        const people = r.customPeople !== null ? r.customPeople : defaultPeople
        return {
          id: crypto.randomUUID(),
          type: r.type,
          amount: Number(r.amount),
          hours: r.type === 'san' && Number(r.hours) > 0 ? Number(r.hours) : undefined,
          note: r.note.trim(),
          payer,
          people,
        }
      })
  }, [rows, defaultPayer, defaultPeople])

  const totalAmount = useMemo(() => {
    return activeEntries.reduce((sum, e) => sum + (e.amount || 0), 0)
  }, [activeEntries])

  const cauRowPeople = useMemo(() => {
    const cauRow = rows.find((r) => r.type === 'cau')
    if (cauRow && cauRow.customPeople !== null) return cauRow.customPeople
    if (badmintonPlayers && badmintonPlayers.length > 0) return badmintonPlayers
    return defaultPeople
  }, [rows, badmintonPlayers, defaultPeople])

  const perPersonEstimate = useMemo(() => {
    if (defaultPeople.length === 0) return 0
    return Math.round(totalAmount / defaultPeople.length)
  }, [totalAmount, defaultPeople])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (activeEntries.length === 0) return
    onApplyEntries(activeEntries)
  }

  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '16px 20px', marginBottom: '16px', boxShadow: 'var(--shadow)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)', color: 'white', padding: '4px 8px', borderRadius: '8px', fontSize: '1rem', fontWeight: 800 }}>⚡</span>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>Nhập nhanh số tiền các khoản chi</h3>
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Nhập thẳng số tiền bên dưới • Hệ thống tự chia cho <strong>{defaultPeople.length} người</strong>
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {rows.map((row) => {
            const typeInfo = sortedTypes.find((t) => t.value === row.type) || { label: row.type, emoji: '🧾' }
            const effectivePayer = row.customPayer || defaultPayer
            const payerObj = players.find((p) => p.id === effectivePayer)
            const payerName = payerObj ? payerObj.name : effectivePayer
            const effectivePeople = row.customPeople !== null ? row.customPeople : defaultPeople
            const hasCustomOverride = row.customPayer || row.customPeople !== null

            return (
              <div
                key={row.id}
                style={{
                  borderRadius: '10px',
                  padding: '8px 12px',
                  background: row.enabled ? 'var(--color-bg-app)' : 'transparent',
                  border: row.enabled ? '1px solid var(--border)' : '1px dashed var(--border)',
                  opacity: row.enabled ? 1 : 0.6,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Enable checkbox */}
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => updateRow(row.id, { enabled: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />

                  {/* Type Picker / Label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '140px' }}>
                    <span style={{ fontSize: '1.1rem' }}>{typeInfo.emoji || '🧾'}</span>
                    <select
                      value={row.type}
                      onChange={(e) => updateRow(row.id, { type: e.target.value })}
                      disabled={!row.enabled}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        background: 'var(--card-bg)',
                        color: 'var(--text)',
                      }}
                    >
                      {sortedTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Hours (if court) */}
                  {row.type === 'san' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={row.hours}
                        onChange={(e) => updateRow(row.id, { hours: e.target.value })}
                        placeholder="Giờ"
                        disabled={!row.enabled}
                        style={{ width: '55px', padding: '4px 6px', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center', fontSize: '0.85rem', background: 'var(--card-bg)' }}
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>h</span>
                    </div>
                  )}

                  {/* Amount Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={row.amount}
                      onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                      placeholder="VD: 240"
                      disabled={!row.enabled}
                      style={{
                        width: '100px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--primary)',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: 'var(--primary)',
                        background: 'var(--card-bg)',
                      }}
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>k</span>
                  </div>

                  {/* Summary Pill & Override Trigger */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--card-bg)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      Trả: <strong>{payerName}</strong> ({effectivePeople.length} người)
                    </span>

                    <button
                      type="button"
                      className={`btn btn-sm ${hasCustomOverride ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                      onClick={() => updateRow(row.id, { showOverride: !row.showOverride })}
                    >
                      {hasCustomOverride ? '⚙️ Đã chỉnh' : '⚙️ Chỉnh riêng'}
                    </button>

                    {rows.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '2px 6px', fontSize: '0.72rem', color: 'var(--danger)', borderColor: 'transparent' }}
                        onClick={() => removeRow(row.id)}
                        title="Xóa khoản này"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Per-row Manual Override Drawer */}
                {row.showOverride && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Người trả khoản này:</label>
                        <select
                          value={row.customPayer || defaultPayer}
                          onChange={(e) => updateRow(row.id, { customPayer: e.target.value === defaultPayer ? '' : e.target.value })}
                          style={{ padding: '3px 6px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', background: 'var(--card-bg)' }}
                        >
                          {players.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Ghi chú:</label>
                        <input
                          type="text"
                          value={row.note}
                          onChange={(e) => updateRow(row.id, { note: e.target.value })}
                          placeholder="Ghi chú thêm..."
                          style={{ padding: '3px 6px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', background: 'var(--card-bg)' }}
                        />
                      </div>
                    </div>

                    <MiniPeoplePicker
                      selected={effectivePeople}
                      onToggle={(nextPeople) => updateRow(row.id, { customPeople: nextPeople })}
                      players={players}
                      badmintonPlayers={cauRowPeople}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={addCustomRow}
            style={{ fontSize: '0.78rem', padding: '4px 10px' }}
          >
            ＋ Thêm khoản phí khác
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {activeEntries.length > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-court-green-dark)' }}>
                  Tổng: {formatMoney(totalAmount * 1000)}
                </div>
                {defaultPeople.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    ~{formatMoney(perPersonEstimate * 1000)}/người ({defaultPeople.length} người)
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={activeEntries.length === 0 || defaultPeople.length === 0}
              style={{ opacity: activeEntries.length === 0 || defaultPeople.length === 0 ? 0.5 : 1, padding: '8px 16px', fontWeight: 700 }}
            >
              ⚡ Áp dụng {activeEntries.length} khoản vào phiên
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
