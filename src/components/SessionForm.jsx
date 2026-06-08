import { useEffect, useId, useMemo, useState, useCallback, useRef, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { PLAYERS, DEFAULT_PAYER, formatMoney, calculateTotals, getEntryLabel, sortExpenseTypes, sortPlayerNames } from '../constants'
import PlayerAvatar from './PlayerAvatar'

function PeoplePicker({ selected, onToggle, players = [], combos = [], onAddName, customName, onCustomNameChange }) {
  const sortedPlayers = useMemo(() => players.slice().sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })), [players])
  const displayPlayers = useMemo(() => {
    const ids = new Set(sortedPlayers.map((p) => p.id))
    // include selected ids that may not be in players list
    const extras = selected.filter((id) => !ids.has(id)).map((id) => ({ id, name: id }))
    return [...sortedPlayers, ...extras]
  }, [sortedPlayers, selected])

  // Sort combo members alphabetically by name
  const sortedCombos = useMemo(() => {
    return (combos || []).map((combo) => ({
      ...combo,
      members: (combo.members || [])
        .slice()
        .sort((a, b) => {
          const nameA = (players.find((p) => p.id === a)?.name) || String(a)
          const nameB = (players.find((p) => p.id === b)?.name) || String(b)
          return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' })
        })
    }))
  }, [combos, players])

  const allSelected = sortedPlayers.length > 0 && sortedPlayers.every((p) => selected.includes(p.id))

  const resolveMemberId = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return null
    const byId = players.find((p) => String(p.id) === raw)
    if (byId) return byId.id
    const byName = players.find((p) => p.name === raw)
    if (byName) return byName.id
    // Fallback: if not found by id or name, return raw (it might be a valid id not in players list yet)
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

  return (
    <div>
      <div className="select-actions">
        {(sortedCombos || []).map((combo) => (
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
            const next = allSelected ? [] : sortedPlayers.map((p) => p.id)
            onToggle(next)
          }}
        >
          {allSelected ? 'Bỏ tất cả' : 'Tất cả'}
        </button>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
          {selected.length} người
        </span>
      </div>
      
      <div
        className="people-picker"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        }}
      >
        {displayPlayers.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`people-chip ${selected.includes(p.id) ? 'selected' : ''}`}
            onClick={() => {
              const next = selected.includes(p.id)
                ? selected.filter((n) => n !== p.id)
                : [...selected, p.id]
              onToggle(next)
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <PlayerAvatar player={p} size={24} />
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}


function ExpenseTypePicker({ value, expenseTypes = [], onSelect }) {
  const sortedTypes = useMemo(() => sortExpenseTypes(expenseTypes), [expenseTypes])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const selectedType = useMemo(
    () => sortedTypes.find((t) => t.value === value) || null,
    [sortedTypes, value]
  )

  const inputRef = useRef(null)

  useEffect(() => {
    setQuery(selectedType ? selectedType.label : '')
  }, [selectedType])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query, open])

  const filteredTypes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sortedTypes
    return sortedTypes.filter((t) => {
      const haystack = `${t.label || ''} ${t.value || ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [query, sortedTypes])

  const chooseType = (type) => {
    onSelect(type.value)
    setQuery(type.label)
    setOpen(false)
    setHighlightedIndex(0)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredTypes.length > 0) chooseType(filteredTypes[highlightedIndex] || filteredTypes[0])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlightedIndex((index) => Math.min(index + 1, filteredTypes.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setHighlightedIndex((index) => Math.max(index - 1, 0))
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        {selectedType && (
          <span
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              pointerEvents: 'none',
              fontSize: 18,
            }}
          >
            {selectedType.emoji || '🧾'}
          </span>
        )}
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder="Nhập tên chi phí..."
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{ paddingLeft: selectedType ? '38px' : undefined, paddingRight: '34px' }}
      />
        {selectedType && (
          <button
            type="button"
            aria-label="Clear expense"
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
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 14,
              zIndex: 3,
              padding: '2px 6px'
            }}
          >
            ×
          </button>
        )}
      </div>

      {open && filteredTypes.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 20,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: '220px',
            overflow: 'auto',
          }}
        >
          {filteredTypes.slice(0, 8).map((t) => (
            <button
              key={t.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => chooseType(t)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                border: 'none',
                background: filteredTypes[highlightedIndex]?.value === t.value ? 'rgba(255, 147, 46, 0.12)' : 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHighlightedIndex(filteredTypes.findIndex((item) => item.value === t.value))}
            >
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{t.emoji || '🧾'}</span>
              <span>{t.label}</span>
              {t.value === value && (
                <span style={{ marginLeft: 'auto', color: 'var(--success)', fontSize: 12, fontWeight: 700 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PayerPicker({ value, players = [], onSelect }) {
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
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder="Chọn người trả..."
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{ paddingRight: '34px' }}
      />

      {selectedPlayer && (
        <button
          type="button"
          aria-label="Clear payer"
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
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 14,
            zIndex: 3,
            padding: '2px 6px'
          }}
        >
          ×
        </button>
      )}

      {open && filteredPlayers.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 20,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: '220px',
            overflow: 'auto',
          }}
        >
          {filteredPlayers.map((player) => (
            <button
              key={player.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choosePlayer(player)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                border: 'none',
                background: filteredPlayers[highlightedIndex]?.id === player.id ? 'rgba(255, 147, 46, 0.12)' : 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHighlightedIndex(filteredPlayers.findIndex((item) => item.id === player.id))}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>👤</span>
              <span>{player.name}</span>
              {player.id === value && (
                <span style={{ marginLeft: 'auto', color: 'var(--success)', fontSize: 12, fontWeight: 700 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


function EntryForm({ onAdd, lastPeople, lastPayer, lastType, players = [], names = [], expenseTypes, combos = [], onAddName, onAddExpenseType, onAdded }) {
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
  }



  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group" style={{ flex: '0 0 auto', minWidth: '150px' }}>
          <label>Loại chi phí</label>
          <ExpenseTypePicker
            value={type}
            expenseTypes={sortedTypes}
            onSelect={(newType) => {
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
            }}
          />
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
          <>
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
        
          </>
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
          <PayerPicker value={payer} players={players} onSelect={setPayer} />
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
          Người tham gia
        </label>
        <PeoplePicker 
          selected={people} 
          onToggle={setPeople} 
          players={players}
          combos={combos}
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

function EditEntryForm({ entry, players = [], expenseTypes, combos = [], onAddName, onSave, onCancel }) {
  const [type, setType] = useState(entry.type)
  const [hours, setHours] = useState(entry.hours ? String(entry.hours) : '')
  const [amount, setAmount] = useState(String(entry.amount))
  const [note, setNote] = useState(entry.note || '')
  const [payer, setPayer] = useState(entry.payer)
  const [people, setPeople] = useState(entry.people)
  const [customName, setCustomName] = useState('')
  const sortedTypes = useMemo(() => sortExpenseTypes(expenseTypes), [expenseTypes])

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
          <ExpenseTypePicker
            value={type}
            expenseTypes={sortedTypes}
            onSelect={(newType) => {
            setType(newType)
            // Reset people if type is not one of the main types
            if (!['san', 'cau', 'tra-da'].includes(newType)) {
              setPeople([])
            }
            }}
          />
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
          <PayerPicker value={payer} players={players} onSelect={setPayer} />
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
          Người tham gia
        </label>
        <PeoplePicker selected={people} onToggle={setPeople} players={players} combos={combos} onAddName={onAddName} customName={customName} onCustomNameChange={setCustomName} />
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

export default function SessionForm({ session, players = [], expenseTypes, combos = [], onAddPlayerName, onAddExpenseType, onSave, onCancel }) {
  const [date, setDate] = useState(session.date || new Date().toISOString().split('T')[0])
  const dateInputId = useId()
  const [entries, setEntries] = useState(session.entries || [])
  const [editingEntry, setEditingEntry] = useState(null)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)
  const [lastPeople, setLastPeople] = useState([])
  const [lastPayer, setLastPayer] = useState(() => {
    const found = (players || []).find((p) => p.name === DEFAULT_PAYER)
    return found ? found.id : DEFAULT_PAYER
  })

  // if players load after mount, ensure lastPayer is the id for DEFAULT_PAYER
  useEffect(() => {
    if (!players || players.length === 0) return
    const found = players.find((p) => p.name === DEFAULT_PAYER)
    if (found) {
      // only update if lastPayer is still the default name or invalid id
      const currentIsValid = players.some((pl) => pl.id === lastPayer)
      if (!currentIsValid || lastPayer === DEFAULT_PAYER) {
        setLastPayer(found.id)
      }
    }
  }, [players])
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
  const idToName = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p.name])), [players])
  // build ordered expense types present in this session (objects with emoji/label/value)
  const sessionExpenseTypes = useMemo(() => {
    const typeSet = new Set((entries || []).map(e => e.type))
    const arr = [...typeSet].map(t => {
      const found = expenseTypes?.find(et => et.value === t)
      return found || { value: t, label: t, emoji: '' }
    })
    return sortExpenseTypes(arr)
  }, [entries, expenseTypes])

  const perPlayerDetail = useMemo(() => {
    const detail = {}
    ;(entries || []).forEach((entry) => {
      const label = String(getEntryLabel(entry, expenseTypes) || entry.type)
      const people = entry.people || []
      const share = (entry.amount || 0) / Math.max(people.length, 1)
      people.forEach((p) => {
        const name = idToName[p] || p
        if (!detail[name]) detail[name] = { total: 0, types: {} }
        detail[name].total += share
        detail[name].types[label] = (detail[name].types[label] || 0) + share
      })
    })
    return detail
  }, [entries, expenseTypes, idToName])
  const participantNames = useMemo(() => {
    return sortPlayerNames(entries.flatMap((entry) => [idToName[entry.payer] || entry.payer, ...(entry.people || []).map((p) => idToName[p] || p)]))
  }, [entries, idToName])
  const playerColumns = useMemo(() => {
    return sortPlayerNames([...new Set(entries.flatMap((entry) => (entry.people || []).map((p) => idToName[p] || p)))])
  }, [entries, idToName])

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
    const wrapperRef = useRef(null)
    const [open, setOpen] = useState(false)
    const [viewYear, setViewYear] = useState(() => (value ? Number(String(value).slice(0,4)) : new Date().getFullYear()))
    const [viewMonth, setViewMonth] = useState(() => (value ? Number(String(value).slice(5,7)) - 1 : new Date().getMonth()))

    useEffect(() => {
      const onDocClick = (e) => {
        if (!wrapperRef.current) return
        // If click is inside the launcher, keep open
        if (wrapperRef.current.contains(e.target)) return
        // If click is inside the portaled popover, keep open
        if (e.target && e.target.closest && e.target.closest('.custom-datepicker-popover')) return
        // If click is inside month/year modal, keep open
        if (e.target && e.target.closest && (e.target.closest('.cdp-month-modal') || e.target.closest('.cdp-year-modal'))) return
        setOpen(false)
      }
      document.addEventListener('click', onDocClick)
      return () => document.removeEventListener('click', onDocClick)
    }, [])

    useEffect(() => {
      if (value) {
        setViewYear(Number(String(value).slice(0,4)))
        setViewMonth(Number(String(value).slice(5,7)) - 1)
      }
    }, [value])

    const [popoverStyle, setPopoverStyle] = useState(null)
    const [pickerMode, setPickerMode] = useState('calendar') // 'calendar' | 'months' | 'year'

    const openPicker = () => setOpen((s) => !s)

    // compute popover position when opened
    useEffect(() => {
      if (!open) {
        setPopoverStyle(null)
        setPickerMode('calendar')
        return
      }
      if (!wrapperRef.current) return
      const rect = wrapperRef.current.getBoundingClientRect()
      const top = rect.bottom + window.scrollY + 8
      const left = rect.left + window.scrollX
      // ensure popover stays within viewport horizontally
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
      const popoverWidth = 360
      let adjustedLeft = left
      if (left + popoverWidth > vw - 12) {
        adjustedLeft = Math.max(12, vw - popoverWidth - 12)
      }
      setPopoverStyle({ position: 'absolute', top: `${top}px`, left: `${adjustedLeft}px`, width: `${popoverWidth}px` })
    }, [open, viewMonth, viewYear])

    const [showMonthModal, setShowMonthModal] = useState(false)
    const [showYearModal, setShowYearModal] = useState(false)

    const changeMonth = (delta) => {
      let m = viewMonth + delta
      let y = viewYear
      if (m < 0) { m = 11; y -= 1 }
      if (m > 11) { m = 0; y += 1 }
      setViewMonth(m); setViewYear(y)
    }

    const selectDay = (d) => {
      const mm = String(viewMonth + 1).padStart(2, '0')
      const dd = String(d).padStart(2, '0')
      const iso = `${viewYear}-${mm}-${dd}`
      onChange(iso)
      setOpen(false)
    }

    const buildDays = (y, m) => {
      const first = new Date(y, m, 1)
      // map Monday=0
      const firstWeekday = (first.getDay() + 6) % 7
      const daysInMonth = new Date(y, m + 1, 0).getDate()
      const cells = []
      for (let i = 0; i < firstWeekday; i++) cells.push(null)
      for (let d = 1; d <= daysInMonth; d++) cells.push(d)
      // pad to full weeks
      while (cells.length % 7 !== 0) cells.push(null)
      const weeks = []
      for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
      return weeks
    }

    const weeks = buildDays(viewYear, viewMonth)

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

    return (
      <div className="form-group" style={{ position: 'relative', display: 'inline-block' }} ref={wrapperRef}>
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
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--card-bg)',
            minWidth: '160px',
            cursor: 'pointer',
            position: 'relative',
            boxShadow: 'var(--shadow)'
          }}
        >
          <span style={{ fontSize: '0.95rem' }}>{formatDisplayDate(value) || 'Chọn ngày'}</span>
          <span style={{ marginLeft: 'auto', opacity: 0.8 }}>📅</span>

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
              cursor: 'default',
              pointerEvents: 'none',
              zIndex: 0,
              background: 'transparent',
            }}
            aria-label="Chọn ngày"
          />

          {open && popoverStyle && createPortal(
            <div
              className="custom-datepicker-popover"
              role="dialog"
              aria-modal="true"
              style={popoverStyle}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cdp-header">
                <button type="button" className="cdp-nav-button" onClick={(e) => { e.stopPropagation(); changeMonth(-1) }}>‹</button>
                <div className="cdp-month-year">
                  <button type="button" className="cdp-month-button" onClick={(e) => { e.stopPropagation(); setShowMonthModal(true) }}>
                    <strong>{monthNames[viewMonth]}</strong>
                  </button>
                  <button type="button" className="cdp-year-button" onClick={(e) => { e.stopPropagation(); setShowYearModal(true) }}>
                    <div className="cdp-year">{viewYear}</div>
                  </button>
                </div>
                <button type="button" className="cdp-nav-button" onClick={(e) => { e.stopPropagation(); changeMonth(1) }}>›</button>
              </div>
              {pickerMode === 'calendar' && (
                <>
                  <div className="cdp-weekdays">
                    <div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div><div>Su</div>
                  </div>
                  <div className="cdp-grid">
                    {weeks.map((week, wi) => (
                      <div className="cdp-week" key={wi}>
                        {week.map((d, di) => {
                          const isToday = d && new Date().toISOString().slice(0,10) === `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                          const selected = d && value === `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                          return (
                            <button
                              key={di}
                              type="button"
                              className={`cdp-day ${d ? '' : 'empty'} ${isToday ? 'today' : ''} ${selected ? 'selected' : ''}`}
                              onClick={() => d && selectDay(d)}
                              disabled={!d}
                            >
                              {d || ''}
                            </button>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {pickerMode === 'months' && (
                <div className="cdp-months-grid">
                  {monthNames.map((m, idx) => (
                    <button
                      key={m}
                      type="button"
                      className={`cdp-month ${idx === viewMonth ? 'selected' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setViewMonth(idx); setPickerMode('calendar') }}
                    >
                      {m.slice(0,3)}
                    </button>
                  ))}
                </div>
              )}

              {pickerMode === 'year' && (
                <div className="cdp-year-picker">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <button type="button" className="cdp-nav-button" onClick={(e) => { e.stopPropagation(); setViewYear((y) => y - 1) }}>-</button>
                    <input
                      type="number"
                      value={viewYear}
                      onChange={(e) => setViewYear(Number(e.target.value) || viewYear)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setPickerMode('calendar') } }}
                      onBlur={() => setPickerMode('calendar')}
                      style={{ width: 80, textAlign: 'center' }}
                    />
                    <button type="button" className="cdp-nav-button" onClick={(e) => { e.stopPropagation(); setViewYear((y) => y + 1) }}>+</button>
                  </div>
                </div>
              )}
            </div>,
            document.body
          )}
          {showMonthModal && createPortal(
            <div className="cdp-month-modal" style={{position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400}} onClick={() => setShowMonthModal(false)}>
              <div className="card" style={{ width: '100%', maxWidth: '420px', padding: 12 }} onClick={(e) => e.stopPropagation()}>
                <div className="card-title" style={{ justifyContent: 'space-between' }}>
                  <span>Chọn tháng</span>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowMonthModal(false)}>Đóng</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '8px 4px' }}>
                  {monthNames.map((m, idx) => (
                    <button key={m} type="button" className={`cdp-month ${idx === viewMonth ? 'selected' : ''}`} onClick={(e) => { e.stopPropagation(); setViewMonth(idx); setShowMonthModal(false) }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>, document.body
          )}

          {showYearModal && createPortal(
            <div className="cdp-year-modal" style={{position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400}} onClick={() => setShowYearModal(false)}>
              <div className="card" style={{ width: '100%', maxWidth: '320px', padding: 12 }} onClick={(e) => e.stopPropagation()}>
                <div className="card-title" style={{ justifyContent: 'space-between' }}>
                  <span>Chọn năm</span>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowYearModal(false)}>Đóng</button>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '8px 4px' }}>
                  <button type="button" className="cdp-nav-button" onClick={(e) => { e.stopPropagation(); setViewYear((y) => y - 1) }}>-</button>
                  <input type="number" value={viewYear} onChange={(e) => setViewYear(Number(e.target.value) || viewYear)} style={{ width: 100, textAlign: 'center' }} />
                  <button type="button" className="cdp-nav-button" onClick={(e) => { e.stopPropagation(); setViewYear((y) => y + 1) }}>+</button>
                </div>
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={() => setShowYearModal(false)}>OK</button>
                </div>
              </div>
            </div>, document.body
          )}
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
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          📋 Danh sách chi phí ({entries.length} khoản)
          <button type="button" className="btn btn-primary"  onClick={() => setIsEntryModalOpen(true)}>
          + Thêm khoản chi
          </button>
        </div>
        
        <div className="table-wrap">
          <table className="result-table">
            <colgroup>
              <col style={{ width: '120px' }} />
              <col style={{ width: '24px' }} />
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
                              {idToName[entry.payer] || entry.payer}
                            </td>
                            <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                              {formatMoney(entry.amount * 1000)}
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'rgb(73, 101, 243)', minWidth: 0 }}>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: `repeat(${Math.max(playerColumns.length, 1)}, minmax(1px, 1fr))`,
                                  gap: '4px',
                                  width: '100%',
                                }}
                              >
                                {playerColumns.map((name) => {
                                  const playerObj = players.find((p) => p.name === name)
                                  const id = playerObj ? playerObj.id : null
                                  const active = id ? entry.people.includes(id) : entry.people.includes(name)
                                  return (
                                    <span
                                      key={name}
                                      style={{
                                        backgroundColor: active ? 'rgba(73, 101, 243, 0.2)' : 'transparent',
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
                                      {active ? name : ''}
                                    </span>
                                  )
                                })}
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
              <th>Loại chi phí</th>
              <th>Chia đều (/người)</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Chưa có dữ liệu tạm tính.
                </td>
              </tr>
            ) : (
              (() => {
                const detail = {}
                entries.forEach((entry) => {
                  const label = String(getEntryLabel(entry, expenseTypes) || entry.type)
                  const people = entry.people || []
                  const share = (entry.amount || 0) / Math.max(people.length, 1)
                  people.forEach((p) => {
                    const name = idToName[p] || p
                    if (!detail[name]) detail[name] = { total: 0, types: {} }
                    detail[name].total += share
                    detail[name].types[label] = (detail[name].types[label] || 0) + share
                  })
                })

                const rows = Object.entries(detail).sort((a, b) => b[1].total - a[1].total).map(([name, data]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {Object.entries(data.types).map(([tLabel, amt]) => `${tLabel}: ${formatMoney(Math.round(amt * 1000))}`).join(', ')}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>{formatMoney(Math.round(data.total * 1000))}</td>
                  </tr>
                ))

                return (
                  <>
                    {rows}
                    <tr className="result-total">
                      <td>Tổng cộng</td>
                      <td />
                      <td>{formatMoney(Math.round(grandTotal * 1000))}</td>
                    </tr>
                  </>
                )
              })()
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
                onAdded={() => setIsEntryModalOpen(false)}
                lastPeople={lastPeople}
                lastPayer={lastPayer}
                lastType={lastType}
                players={players}
                expenseTypes={expenseTypes}
                combos={combos}
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
                players={players}
                expenseTypes={expenseTypes}
                combos={combos}
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
