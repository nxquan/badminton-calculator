import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { sortExpenseTypes, DEFAULT_EXPENSE_TYPES, formatMoney } from '../constants'
import PlayerAvatar from './PlayerAvatar'

function PayerPicker({ value, players = [], onSelect, placeholder = 'Chọn người trả...' }) {
  const sortedPlayers = useMemo(
    () => players.slice().sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })),
    [players]
  )
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const selectedPlayer = useMemo(
    () => sortedPlayers.find((p) => p.id === value) || null,
    [sortedPlayers, value]
  )

  const inputRef = useRef(null)

  useEffect(() => {
    setQuery(selectedPlayer ? selectedPlayer.name : '')
  }, [selectedPlayer])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query, open])

  const filteredPlayers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sortedPlayers
    return sortedPlayers.filter((player) => {
      const haystack = `${player.name || ''} ${player.id || ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [query, sortedPlayers])

  const choosePlayer = (player) => {
    onSelect(player.id)
    setQuery(player.name)
    setOpen(false)
    setHighlightedIndex(0)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredPlayers.length > 0) choosePlayer(filteredPlayers[highlightedIndex] || filteredPlayers[0])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlightedIndex((index) => Math.min(index + 1, filteredPlayers.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setHighlightedIndex((index) => Math.max(index - 1, 0))
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {selectedPlayer && (
          <div style={{ position: 'absolute', left: '8px', display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 2 }}>
            <PlayerAvatar player={selectedPlayer} size={22} />
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          style={{
            width: '100%',
            padding: '6px 10px',
            paddingLeft: selectedPlayer ? '36px' : '10px',
            paddingRight: '30px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            fontSize: '0.85rem',
            background: 'var(--card-bg)',
            color: 'var(--text)',
            fontWeight: selectedPlayer ? 600 : 400,
          }}
        />

        {selectedPlayer && (
          <button
            type="button"
            aria-label="Clear payer"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation()
              onSelect('')
              setQuery('')
              setHighlightedIndex(0)
              setOpen(true)
              inputRef.current?.focus()
            }}
            style={{
              position: 'absolute',
              right: '6px',
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              zIndex: 3,
              padding: '2px 6px',
              lineHeight: 1,
            }}
            title="Bỏ chọn người trả"
          >
            ✕
          </button>
        )}
      </div>

      {open && filteredPlayers.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {filteredPlayers.map((player, index) => {
            const isSelected = player.id === value
            const isHighlighted = highlightedIndex === index
            return (
              <button
                key={player.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choosePlayer(player)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  border: 'none',
                  background: isHighlighted ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: isSelected ? 700 : 400,
                  color: isSelected ? 'var(--primary)' : 'var(--text)',
                }}
              >
                <PlayerAvatar player={player} size={22} />
                <span style={{ flex: 1 }}>{player.name}</span>
                {isSelected && (
                  <span style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: 800 }}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MiniPeoplePicker({ selected, onToggle, players = [], badmintonPlayers = [], combos = [] }) {
  const sortedPlayers = useMemo(
    () => players.slice().sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })),
    [players]
  )
  const [searchQuery, setSearchQuery] = useState('')

  const targetBadminton = (badmintonPlayers && badmintonPlayers.length > 0)
    ? badmintonPlayers
    : sortedPlayers.map((p) => p.id)

  const isBadmintonActive = targetBadminton.length > 0 &&
    targetBadminton.every((id) => selected.includes(id)) &&
    selected.every((id) => targetBadminton.includes(id))

  const allSelected = sortedPlayers.length > 0 && sortedPlayers.every((p) => selected.includes(p.id))

  const sortedCombos = useMemo(() => {
    return (combos || []).map((combo) => ({
      ...combo,
      members: (combo.members || [])
        .slice()
        .sort((a, b) => {
          const nameA = players.find((p) => p.id === a)?.name || String(a)
          const nameB = players.find((p) => p.id === b)?.name || String(b)
          return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' })
        })
    }))
  }, [combos, players])

  const resolveMemberId = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return null
    const byId = players.find((p) => String(p.id) === raw)
    if (byId) return byId.id
    const byName = players.find((p) => p.name === raw)
    if (byName) return byName.id
    return raw
  }

  const comboMemberIds = (combo) => (combo.members || []).map(resolveMemberId).filter(Boolean)

  const isComboActive = (combo) => {
    const memberIds = comboMemberIds(combo)
    return memberIds.length > 0 && memberIds.every((m) => selected.includes(m)) && selected.every((s) => memberIds.includes(s))
  }

  const handleCombo = (combo) => {
    const memberIds = comboMemberIds(combo)
    onToggle(isComboActive(combo) ? [] : [...memberIds])
  }

  const togglePlayer = (id) => {
    if (selected.includes(id)) {
      onToggle(selected.filter((item) => item !== id))
    } else {
      onToggle([...selected, id])
    }
  }

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sortedPlayers
    return sortedPlayers.filter((p) => p.name.toLowerCase().includes(q))
  }, [sortedPlayers, searchQuery])

  return (
    <div style={{ marginTop: '4px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            👥 Người tham gia khoản này ({selected.length}/{players.length} người):
          </span>
          {players.length > 8 && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Lọc tên..."
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                fontSize: '0.75rem',
                background: 'var(--card-bg)',
                color: 'var(--text)',
                maxWidth: '140px',
              }}
            />
          )}
        </div>

        <div className="select-actions" style={{ flexWrap: 'wrap', gap: '6px', marginBottom: 0 }}>
          <button
            type="button"
            className={`btn btn-sm ${isBadmintonActive ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '3px 10px', fontSize: '0.75rem' }}
            onClick={() => onToggle(isBadmintonActive ? [] : [...targetBadminton])}
          >
            🏸 Tham gia chơi cầu
          </button>

          {sortedCombos.map((combo) => (
            <button
              key={combo.label}
              type="button"
              className={`btn btn-sm ${isComboActive(combo) ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '3px 10px', fontSize: '0.75rem' }}
              onClick={() => handleCombo(combo)}
            >
              {combo.emoji} {combo.label}
            </button>
          ))}

          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ padding: '3px 10px', fontSize: '0.75rem' }}
            onClick={() => onToggle(allSelected ? [] : sortedPlayers.map((p) => p.id))}
          >
            {allSelected ? 'Bỏ tất cả' : 'Tất cả'}
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onToggle([])}
            disabled={selected.length === 0}
            style={{ padding: '3px 10px', fontSize: '0.75rem', opacity: selected.length === 0 ? 0.5 : 1 }}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="people-picker">
        {filteredPlayers.map((p) => {
          const isSelected = selected.includes(p.id)
          return (
            <button
              key={p.id}
              type="button"
              className={`people-chip ${isSelected ? 'selected' : ''}`}
              onClick={() => togglePlayer(p.id)}
            >
              <PlayerAvatar player={p} size={22} />
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
  combos = [],
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
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
                  position: 'relative',
                  zIndex: row.showOverride ? 20 : 1,
                  borderRadius: '10px',
                  padding: '10px 14px',
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
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: 'var(--card-bg)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '12px',
                        alignItems: 'start',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          💳 Người trả khoản này:
                        </label>
                        <PayerPicker
                          value={row.customPayer || defaultPayer}
                          players={players}
                          onSelect={(payerId) =>
                            updateRow(row.id, { customPayer: payerId === defaultPayer ? '' : payerId })
                          }
                          placeholder="Tìm hoặc chọn người trả..."
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          📝 Ghi chú khoản này:
                        </label>
                        <input
                          type="text"
                          value={row.note}
                          onChange={(e) => updateRow(row.id, { note: e.target.value })}
                          placeholder="VD: Cầu 3in1, Thuê thêm sân..."
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '0.85rem',
                            background: 'var(--card-bg)',
                            color: 'var(--text)',
                          }}
                        />
                      </div>
                    </div>

                    <MiniPeoplePicker
                      selected={effectivePeople}
                      onToggle={(nextPeople) => updateRow(row.id, { customPeople: nextPeople })}
                      players={players}
                      badmintonPlayers={cauRowPeople}
                      combos={combos}
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
              ⚡ Thêm {activeEntries.length} khoản vào phiên
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

