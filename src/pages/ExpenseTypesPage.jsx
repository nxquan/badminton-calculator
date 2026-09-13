import { useState, useMemo } from 'react'
import { CreditCard, Plus, Pencil, Trash2, Search, Filter } from 'lucide-react'

export default function ExpenseTypesPage({ 
  expenseTypes = [], 
  sessions = [],
  onAddClick, 
  onEditClick, 
  onDeleteClick 
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // 'all', 'used', 'unused'

  // Determine which expense types have been used in any session
  const usedExpenseTypeValues = useMemo(() => {
    const set = new Set()
    for (const s of sessions || []) {
      for (const e of s.entries || []) {
        if (e.type) {
          set.add(String(e.type).toLowerCase())
        }
      }
    }
    return set
  }, [sessions])

  // Filtered expense types
  const processedTypes = useMemo(() => {
    let result = [...expenseTypes]

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      result = result.filter((t) => 
        String(t.label || '').toLowerCase().includes(term) || 
        String(t.value || '').toLowerCase().includes(term)
      )
    }

    // Status filter
    if (filterStatus === 'used') {
      result = result.filter((t) => 
        usedExpenseTypeValues.has(String(t.value).toLowerCase()) || 
        usedExpenseTypeValues.has(String(t.label).toLowerCase())
      )
    } else if (filterStatus === 'unused') {
      result = result.filter((t) => 
        !usedExpenseTypeValues.has(String(t.value).toLowerCase()) && 
        !usedExpenseTypeValues.has(String(t.label).toLowerCase())
      )
    }

    return result
  }, [expenseTypes, searchTerm, filterStatus, usedExpenseTypeValues])

  const usedCount = useMemo(() => {
    return expenseTypes.filter((t) => 
      usedExpenseTypeValues.has(String(t.value).toLowerCase()) || 
      usedExpenseTypeValues.has(String(t.label).toLowerCase())
    ).length
  }, [expenseTypes, usedExpenseTypeValues])

  const unusedCount = expenseTypes.length - usedCount

  return (
    <div className="card">
      {/* Header & Main Add Button */}
      <div className="card-title" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={22} style={{ color: '#16A34A' }} /> Danh mục Kinh phí Sân đấu ({expenseTypes.length})
        </span>
        <button className="btn btn-add" onClick={onAddClick}>
          <Plus size={18} /> Thêm loại chi phí
        </button>
      </div>

      {/* Toolbar: Compact Search & Status Filter Pills */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#F8FAFC',
        padding: '10px 14px',
        borderRadius: 'var(--radius)',
        border: '1px solid #E2E8F0',
        marginBottom: 14
      }}>
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: '1 1 200px',
          minWidth: 180,
          background: '#FFFFFF',
          border: '1.5px solid #CBD5E1',
          borderRadius: 'var(--radius)',
          padding: '5px 10px'
        }}>
          <Search size={15} style={{ color: '#94A3B8', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Tìm loại chi phí..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: 0, outline: 'none', fontSize: '0.85rem', width: '100%', color: '#0F172A' }}
          />
        </div>

        {/* Filter Status Pills */}
        <div style={{ display: 'flex', gap: 4, background: '#FFFFFF', padding: 3, border: '1px solid #CBD5E1', borderRadius: 'var(--radius)' }}>
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            style={{
              border: 'none',
              padding: '3px 9px',
              borderRadius: 6,
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: filterStatus === 'all' ? '#16A34A' : 'transparent',
              color: filterStatus === 'all' ? '#FFFFFF' : '#475569',
              transition: 'all 0.15s ease'
            }}
          >
            Tất cả ({expenseTypes.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('used')}
            style={{
              border: 'none',
              padding: '3px 9px',
              borderRadius: 6,
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: filterStatus === 'used' ? '#16A34A' : 'transparent',
              color: filterStatus === 'used' ? '#FFFFFF' : '#475569',
              transition: 'all 0.15s ease'
            }}
          >
            Đã dùng ({usedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('unused')}
            style={{
              border: 'none',
              padding: '3px 9px',
              borderRadius: 6,
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: filterStatus === 'unused' ? '#16A34A' : 'transparent',
              color: filterStatus === 'unused' ? '#FFFFFF' : '#475569',
              transition: 'all 0.15s ease'
            }}
          >
            Chưa dùng ({unusedCount})
          </button>
        </div>
      </div>

      {/* Expense Types Compact Grid */}
      <div style={{ padding: '2px 0' }}>
        {expenseTypes.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 16px' }}>
            <p>Chưa có loại kinh phí nào trong hệ thống.</p>
          </div>
        ) : processedTypes.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 16px' }}>
            <p>Không tìm thấy loại chi phí nào phù hợp bộ lọc.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
            {processedTypes.map((t) => {
              const isUsed = usedExpenseTypeValues.has(String(t.value).toLowerCase()) || usedExpenseTypeValues.has(String(t.label).toLowerCase())

              return (
                <div key={t.value} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  background: isUsed ? '#F8FAFC' : '#FFFFFF',
                  border: isUsed ? '1px solid #E2E8F0' : '1px solid #CBD5E1',
                  borderRadius: 'var(--radius)',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{
                      fontSize: '1.4rem',
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}>
                      {t.emoji}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: '#0F172A',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {t.label}
                      </div>
                      <div style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: isUsed ? '#16A34A' : '#94A3B8',
                        marginTop: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2
                      }}>
                        {isUsed ? '✓ Đã dùng' : 'Khả dụng'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 5, flexShrink: 0, marginLeft: 8 }}>
                    <button className="btn btn-outline btn-sm" title="Chỉnh sửa" onClick={() => onEditClick(t)} style={{ padding: '4px 7px' }}>
                      <Pencil size={13} />
                    </button>
                    {!isUsed && (
                      <button className="btn btn-danger-soft btn-sm" title="Xóa loại" onClick={() => {
                        if (confirm(`Xóa loại "${t.label}"?`)) onDeleteClick(t.value)
                      }} style={{ padding: '4px 7px' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


