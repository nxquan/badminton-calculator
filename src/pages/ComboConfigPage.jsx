import { useState, useEffect, useRef } from 'react'
import * as mongoApi from '../services/mongoApi'
import { loadCombos, saveCombos } from '../constants'

export default function ComboConfigPage({ label, combos = [], players = [], onSave }) {
  const nameToId = Object.fromEntries(players.map((p) => [String(p.name || '').trim(), String(p.id)]))
  const idToName = Object.fromEntries(players.map((p) => [String(p.id), String(p.name || '')]))

  const normalizeMemberId = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return null
    return players.some((p) => String(p.id) === raw) ? raw : (nameToId[raw] || raw)
  }

  const displayMemberName = (value) => idToName[String(value)] || String(value || '')

  const [combo, setCombo] = useState(() => {
    const found = (combos || []).find((c) => c.label === label)
    const base = found ? { ...found } : { label, emoji: '🔷', members: [] }
    return { ...base, members: Array.isArray(base.members) ? base.members.map(normalizeMemberId).filter(Boolean) : [] }
  })
  const [members, setMembers] = useState(combo.members || [])
  const [newMember, setNewMember] = useState('')
  const [saving, setSaving] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const pickerRef = useRef(null)
  const originalRef = useRef(combo)

  const EMOJI_CHOICES = ['🟢','🔵','🔴','🟡','🔶','🔷','⚪','⚫','⭐','🏸','🏟️','🧾','🍚','🧊']

  useEffect(() => {
    const found = (combos || []).find((c) => c.label === label)
    const base = found ? { ...found } : { label, emoji: '🔷', members: [] }
    const normalized = { ...base, members: Array.isArray(base.members) ? base.members.map(normalizeMemberId).filter(Boolean) : [] }
    setCombo(normalized)
    setMembers(normalized.members || [])
    setNewMember('')
    originalRef.current = normalized
  }, [label, combos, players])

  const addMember = () => {
    const id = String(newMember || '').trim()
    if (!id) return
    const resolvedId = normalizeMemberId(id)
    if (!resolvedId) return
    if (!players.some((p) => String(p.id) === String(resolvedId))) return
    if (members.includes(resolvedId)) {
      setNewMember('')
      return
    }
    setMembers((m) => [...m, resolvedId])
    setNewMember('')
  }

  const removeMember = (memberId) => {
    setMembers((m) => m.filter((x) => x !== memberId))
  }

  const handleSave = async () => {
    const updated = { ...combo, members }
    setSaving(true)
    try {
      if (onSave) {
        await onSave(updated)
      } else if (mongoApi.isConfigured) {
        await mongoApi.updateCombo(updated.label, updated)
      } else {
        // update localStorage fallback
        const list = loadCombos().map((c) => (c.label === updated.label ? updated : c))
        saveCombos(list)
      }
      setCombo(updated)
      // update original snapshot so Save becomes disabled until further changes
      originalRef.current = updated
      alert('Đã lưu')
    } catch (e) {
      console.error(e)
      alert('Lỗi khi lưu combo')
    } finally {
      setSaving(false)
    }
  }

  function arraysEqualIgnoreOrder(a = [], b = []) {
    if ((a || []).length !== (b || []).length) return false
    const sa = [...a].slice().sort()
    const sb = [...b].slice().sort()
    for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false
    return true
  }

  const isDirty = (() => {
    const orig = originalRef.current || { emoji: '🔷', members: [] }
    const emojiChanged = String((orig.emoji || '')).trim() !== String((combo.emoji || '')).trim()
    const membersChanged = !arraysEqualIgnoreOrder(orig.members || [], members || [])
    return emojiChanged || membersChanged
  })()

  // If there are no players, show instructive placeholder
  if (!players || players.length === 0) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Chọn một mục từ sidebar để bắt đầu</div>
        <div style={{ color: 'var(--text-secondary)' }}>Mở mục "Người chơi" ở thanh bên để thêm người chơi trước khi cấu hình combo.</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: 'space-between' }}>
        <span>{combo.emoji} Danh sách {combo.label}</span>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!isDirty || saving}
          style={{
            background: !isDirty || saving ? 'var(--border)' : 'var(--primary)',
            color: !isDirty || saving ? 'var(--text-secondary)' : 'white',
            boxShadow: !isDirty || saving ? 'none' : '0 2px 4px rgba(255, 147, 46, 0.2)',
            cursor: !isDirty || saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.85 : 1,
          }}
        >
          {saving ? 'Đang lưu...' : !isDirty ? 'Lưu' : 'Lưu thay đổi'}
        </button>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="form-group" style={{ position: 'relative' }}>
          <label>Icon</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowEmojiPicker((s) => !s)} ref={pickerRef}>
              <span style={{ fontSize: 18 }}>{combo.emoji || '🔷'}</span>
              <span style={{ marginLeft: 8 }}>Thay đổi</span>
            </button>
          </div>

          {showEmojiPicker && (
            <div style={{ position: 'absolute', zIndex: 1200, top: 48, left: 0, background: 'white', border: '1px solid var(--border)', padding: 8, borderRadius: 8, boxShadow: 'var(--shadow)' }} onMouseLeave={() => setShowEmojiPicker(false)}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 36px)', gap: 8 }}>
                {EMOJI_CHOICES.map((em) => (
                  <button key={em} type="button" className="emoji-btn" onClick={() => { setCombo((c) => ({ ...c, emoji: em })); setShowEmojiPicker(false) }} style={{ width: 36, height: 36, fontSize: 18 }}>
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 8 }}>
            <label>Danh sách thành viên</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <select value={newMember} onChange={(e) => setNewMember(e.target.value)} style={{ flex: 1 }}>
                <option value="">-- Chọn người chơi --</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id} disabled={members.includes(p.id)}>{p.name}</option>
                ))}
              </select>
              <button className="btn btn-primary" type="button" onClick={addMember} disabled={!newMember}>Thêm</button>
            </div>
          </div>


          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.length === 0 && <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '16px', fontStyle: 'italic' }}>Chưa có thành viên nào.</div>}
            {members
              .slice()
              .sort((a, b) => displayMemberName(a).localeCompare(displayMemberName(b), 'vi', { sensitivity: 'base' }))
              .map((m, idx) => (
              <div
                key={m}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                  e.currentTarget.style.borderColor = 'var(--primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, minWidth: '24px', textAlign: 'center' }}>
                    {idx + 1}.
                  </span>
                  <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                    {displayMemberName(m)}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => removeMember(m)}
                  style={{ flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
