import { useState, useMemo, useRef } from 'react'
import {
  Building2,
  Plus,
  Calendar,
  DollarSign,
  Copy,
  Download,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileText,
  User,
  Split,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Receipt
} from 'lucide-react'
import html2canvas from 'html2canvas'
import { toast } from 'react-toastify'
import {
  DEFAULT_ROOMMATES,
  COMMON_EXPENSE_PRESETS,
  formatVND,
  getCurrentMonthStr,
  formatMonthDisplay,
  calculateRoomExpenseSummary,
  generateRoomExpenseText,
} from '../utils/roomExpenseUtils'

export default function RoomExpensesPage({
  roomExpenses = [],
  onSaveRoomExpense,
  onDeleteRoomExpense,
}) {
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('all')
  const [editingSession, setEditingSession] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewingSession, setViewingSession] = useState(null)
  const billCaptureRef = useRef(null)

  // Sort sessions by month desc, then createdAt desc
  const sortedSessions = useMemo(() => {
    return [...roomExpenses].sort((a, b) => {
      const ma = String(a.month || '')
      const mb = String(b.month || '')
      if (ma !== mb) return mb.localeCompare(ma)
      const ta = new Date(a.createdAt || 0).getTime()
      const tb = new Date(b.createdAt || 0).getTime()
      return tb - ta
    })
  }, [roomExpenses])

  // Extract unique months for filter
  const availableMonths = useMemo(() => {
    const set = new Set()
    for (const s of sortedSessions) {
      if (s.month) set.add(s.month)
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [sortedSessions])

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    if (selectedMonthFilter === 'all') return sortedSessions
    return sortedSessions.filter((s) => s.month === selectedMonthFilter)
  }, [sortedSessions, selectedMonthFilter])

  // Overview statistics (for current selected month or overall latest)
  const stats = useMemo(() => {
    const targetSession = filteredSessions[0] || sortedSessions[0]
    if (!targetSession) {
      return {
        hasData: false,
        totalExpensesAll: 0,
        latestSession: null,
        latestSummary: null,
      }
    }

    const latestSummary = calculateRoomExpenseSummary(targetSession)
    const totalExpensesAll = sortedSessions.reduce((sum, s) => {
      const summ = calculateRoomExpenseSummary(s)
      return sum + summ.totalExpense
    }, 0)

    return {
      hasData: true,
      totalExpensesAll,
      latestSession: targetSession,
      latestSummary,
    }
  }, [filteredSessions, sortedSessions])

  // Handlers
  const handleOpenCreateModal = () => {
    const curMonth = getCurrentMonthStr()
    const newSession = {
      id: crypto.randomUUID(),
      month: curMonth,
      date: new Date().toISOString().split('T')[0],
      title: `Chi phí trọ ${formatMonthDisplay(curMonth)}`,
      payer1: DEFAULT_ROOMMATES.payer1,
      payer2: DEFAULT_ROOMMATES.payer2,
      quanExpenses: [
        {
          id: crypto.randomUUID(),
          name: 'Tiền phòng',
          amount: '',
          split: 'both',
        },
      ],
      triExpenses: [],
      isSettled: false,
      note: '',
      createdAt: new Date().toISOString(),
    }
    setEditingSession(newSession)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (session) => {
    setEditingSession(JSON.parse(JSON.stringify(session)))
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingSession(null)
  }

  const handleSaveModal = (e) => {
    e.preventDefault()
    if (!editingSession) return

    // Clean up empty expense entries
    const cleanQuan = (editingSession.quanExpenses || [])
      .map((item) => ({
        ...item,
        name: String(item.name || '').trim(),
        amount: Number(item.amount) || 0,
      }))
      .filter((item) => item.name && item.amount > 0)

    const cleanTri = (editingSession.triExpenses || [])
      .map((item) => ({
        ...item,
        name: String(item.name || '').trim(),
        amount: Number(item.amount) || 0,
      }))
      .filter((item) => item.name && item.amount > 0)

    if (cleanQuan.length === 0 && cleanTri.length === 0) {
      toast.warning('Vui lòng nhập ít nhất 1 khoản chi có số tiền hợp lệ.')
      return
    }

    const updated = {
      ...editingSession,
      quanExpenses: cleanQuan,
      triExpenses: cleanTri,
      updatedAt: new Date().toISOString(),
    }

    onSaveRoomExpense(updated)
    setIsModalOpen(false)
    setEditingSession(null)
  }

  const handleToggleSettled = (session) => {
    const updated = {
      ...session,
      isSettled: !session.isSettled,
      settledAt: !session.isSettled ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    }
    onSaveRoomExpense(updated)
    toast.success(updated.isSettled ? 'Đã đánh dấu ĐÃ THANH TOÁN' : 'Đã chuyển thành CHỜ THANH TOÁN')
  }

  const handleCopyBill = (session) => {
    const text = generateRoomExpenseText(session)
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('Đã sao chép tóm tắt bill vào bộ nhớ tạm!'))
      .catch(() => toast.error('Không thể sao chép!'))
  }

  const handleDownloadBillImage = async () => {
    if (!billCaptureRef.current) return
    try {
      toast.info('Đang xuất ảnh hoá đơn...')
      const canvas = await html2canvas(billCaptureRef.current, {
        scale: 2,
        backgroundColor: '#0F172A',
        useCORS: true,
      })
      const link = document.createElement('a')
      const monthStr = viewingSession?.month || 'room-bill'
      link.download = `Hoa-don-tro-${monthStr}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Đã tải ảnh hoá đơn thành công!')
    } catch (err) {
      console.error('Download bill error:', err)
      toast.error('Có lỗi xảy ra khi tạo ảnh.')
    }
  }

  return (
    <div className="room-expenses-page" style={{ padding: '0 0 40px 0' }}>
      {/* Top Header Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--primary) 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              }}
            >
              <Building2 size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                Chi phí phòng trọ
              </h1>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Quản lý chi phí sinh hoạt & tiền phòng giữa <strong>{DEFAULT_ROOMMATES.payer1}</strong> & <strong>{DEFAULT_ROOMMATES.payer2}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {availableMonths.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
                <select
                  value={selectedMonthFilter}
                  onChange={(e) => setSelectedMonthFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">📅 Tất cả các tháng ({sortedSessions.length})</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthDisplay(m)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              className="btn btn-add"
              onClick={handleOpenCreateModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: '0.92rem',
              }}
            >
              <Plus size={18} /> Tạo phiên chi phí mới
            </button>
          </div>
        </div>

        {/* Highlight Stats Row */}
        {stats.hasData && stats.latestSummary && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                background: 'var(--bg)',
                borderRadius: 10,
                padding: '12px 16px',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tổng chi tiêu ({formatMonthDisplay(stats.latestSession.month)})
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                {formatVND(stats.latestSummary.totalExpense)}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg)',
                borderRadius: 10,
                padding: '12px 16px',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stats.latestSummary.payer1} đã chi
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3B82F6', marginTop: 4 }}>
                {formatVND(stats.latestSummary.totalQuanPaid)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Chịu: {formatVND(stats.latestSummary.quanShare)}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg)',
                borderRadius: 10,
                padding: '12px 16px',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stats.latestSummary.payer2} đã chi
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F59E0B', marginTop: 4 }}>
                {formatVND(stats.latestSummary.totalTriPaid)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Chịu: {formatVND(stats.latestSummary.triShare)}
              </div>
            </div>

            <div
              style={{
                background: stats.latestSession.isSettled ? 'rgba(34, 197, 94, 0.08)' : 'rgba(249, 115, 22, 0.08)',
                borderRadius: 10,
                padding: '12px 16px',
                border: stats.latestSession.isSettled ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(249, 115, 22, 0.3)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Quyết toán {formatMonthDisplay(stats.latestSession.month)}
              </div>
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: stats.latestSession.isSettled ? 'var(--success)' : 'var(--accent)',
                  marginTop: 4,
                  lineHeight: 1.3,
                }}
              >
                {stats.latestSummary.settlement.direction === 'balanced'
                  ? 'Hai bên đã cân bằng (0đ)'
                  : `${stats.latestSummary.settlement.from} ➔ ${stats.latestSummary.settlement.to}: ${formatVND(stats.latestSummary.settlement.amount)}`}
              </div>
              <div style={{ fontSize: '0.75rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                {stats.latestSession.isSettled ? (
                  <span style={{ color: 'var(--success)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={13} /> Đã thanh toán
                  </span>
                ) : (
                  <span style={{ color: 'var(--accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={13} /> Chờ chuyển khoản
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'var(--text-secondary)',
          }}
        >
          <Building2 size={48} style={{ margin: '0 auto 16px auto', opacity: 0.4, color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Chưa có phiên chi phí phòng trọ nào
          </h3>
          <p style={{ maxWidth: 460, margin: '0 auto 20px auto', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Bắt đầu tạo phiên chi phí hằng tháng để tính toán tiền trọ, điện nước, wifi, nước uống và các chi phí sinh hoạt giữa Quân & Trí!
          </p>
          <button className="btn btn-primary" onClick={handleOpenCreateModal} style={{ fontWeight: 700 }}>
            <Plus size={18} style={{ marginRight: 6 }} /> Tạo phiên chi phí đầu tiên
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {filteredSessions.map((session) => {
            const summary = calculateRoomExpenseSummary(session)
            const monthDisplay = formatMonthDisplay(session.month)
            const isSettled = Boolean(session.isSettled)

            return (
              <div
                key={session.id}
                className="card"
                style={{
                  position: 'relative',
                  borderLeft: isSettled ? '4px solid var(--success)' : '4px solid var(--accent)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Header row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          background: 'var(--color-court-green-soft)',
                          color: 'var(--primary)',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          padding: '4px 10px',
                          borderRadius: 20,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Calendar size={13} /> {monthDisplay}
                      </span>

                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
                        {session.title || `Chi phí trọ ${monthDisplay}`}
                      </h3>

                      {session.date && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          • Ngày ghi: {session.date}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Status pill button */}
                    <button
                      type="button"
                      onClick={() => handleToggleSettled(session)}
                      title="Click để đổi trạng thái thanh toán"
                      style={{
                        background: isSettled ? 'rgba(34, 197, 94, 0.12)' : 'rgba(249, 115, 22, 0.12)',
                        color: isSettled ? 'var(--success)' : 'var(--accent)',
                        border: isSettled ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(249, 115, 22, 0.3)',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSettled ? (
                        <>
                          <CheckCircle2 size={14} /> Đã thanh toán
                        </>
                      ) : (
                        <>
                          <Clock size={14} /> Chờ chuyển khoản
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 2-Person Breakdown Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 14,
                    marginBottom: 16,
                  }}
                >
                  {/* Section 1: Quân AP */}
                  <div
                    style={{
                      background: 'var(--bg)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: '#3B82F6',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                          }}
                        >
                          Q
                        </div>
                        {summary.payer1}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Đã ứng trước:</div>
                        <strong style={{ fontSize: '1rem', color: '#3B82F6' }}>{formatVND(summary.totalQuanPaid)}</strong>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Phần chi phí Quân phải chịu:</span>
                      <strong style={{ color: 'var(--text)' }}>{formatVND(summary.quanShare)}</strong>
                    </div>

                    {/* Expense items preview */}
                    <div style={{ maxHeight: 90, overflowY: 'auto', borderTop: '1px dashed var(--border)', paddingTop: 6 }}>
                      {(session.quanExpenses || []).length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Không có khoản chi</div>
                      ) : (
                        (session.quanExpenses || []).map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '2px 0' }}>
                            <span style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              • {item.name} {item.split === 'tri_only' ? '(Hộ Trí)' : item.split === 'quan_only' ? '(Riêng)' : ''}
                            </span>
                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{formatVND(item.amount)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Section 2: Trí Trần */}
                  <div
                    style={{
                      background: 'var(--bg)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: '#F59E0B',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                          }}
                        >
                          T
                        </div>
                        {summary.payer2}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Đã ứng trước:</div>
                        <strong style={{ fontSize: '1rem', color: '#F59E0B' }}>{formatVND(summary.totalTriPaid)}</strong>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Phần chi phí Trí phải chịu:</span>
                      <strong style={{ color: 'var(--text)' }}>{formatVND(summary.triShare)}</strong>
                    </div>

                    {/* Expense items preview */}
                    <div style={{ maxHeight: 90, overflowY: 'auto', borderTop: '1px dashed var(--border)', paddingTop: 6 }}>
                      {(session.triExpenses || []).length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Không có khoản chi</div>
                      ) : (
                        (session.triExpenses || []).map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '2px 0' }}>
                            <span style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              • {item.name} {item.split === 'quan_only' ? '(Hộ Quân)' : item.split === 'tri_only' ? '(Riêng)' : ''}
                            </span>
                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{formatVND(item.amount)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Settlement Direction Box (The main answer) */}
                <div
                  style={{
                    background: summary.settlement.direction === 'balanced'
                      ? 'rgba(34, 197, 94, 0.08)'
                      : 'linear-gradient(90deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.05) 100%)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    border: summary.settlement.direction === 'balanced'
                      ? '1px solid rgba(34, 197, 94, 0.3)'
                      : '1px solid rgba(249, 115, 22, 0.35)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: summary.settlement.direction === 'balanced' ? 'var(--success)' : 'var(--accent)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {summary.settlement.direction === 'balanced' ? '✓' : '⇄'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                        Kết luận thanh toán {monthDisplay}
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
                        {summary.settlement.direction === 'balanced' ? (
                          <span style={{ color: 'var(--success)' }}>🎉 Hai bên đã cân bằng chi phí (0đ)</span>
                        ) : (
                          <span>
                            👉 <strong style={{ color: 'var(--accent)' }}>{summary.settlement.from}</strong> cần chuyển cho{' '}
                            <strong style={{ color: 'var(--primary)' }}>{summary.settlement.to}</strong>:{' '}
                            <span style={{ color: 'var(--accent)', fontSize: '1.15rem' }}>{formatVND(summary.settlement.amount)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                    Tổng chi phí: <strong style={{ color: 'var(--text)', fontSize: '1rem' }}>{formatVND(summary.totalExpense)}</strong>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    borderTop: '1px solid var(--border)',
                    paddingTop: 12,
                  }}
                >
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleCopyBill(session)}
                    title="Sao chép tin nhắn bill để gửi Zalo / Messenger"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <Copy size={14} /> Sao chép bill
                  </button>

                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setViewingSession(session)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <FileText size={14} /> Xem chi tiết
                  </button>

                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleOpenEditModal(session)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <Pencil size={14} /> Sửa
                  </button>

                  <button
                    className="btn btn-danger-soft btn-sm"
                    onClick={() => {
                      if (window.confirm(`Bạn có chắc chắn muốn xoá phiên chi phí "${session.title || monthDisplay}"?`)) {
                        onDeleteRoomExpense(session.id)
                      }
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <Trash2 size={14} /> Xoá
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL: TẠO / CHỈNH SỬA PHIÊN CHI PHÍ */}
      {isModalOpen && editingSession && (
        <RoomExpenseEditModal
          session={editingSession}
          onClose={handleCloseModal}
          onSave={handleSaveModal}
          setSession={setEditingSession}
        />
      )}

      {/* MODAL: XEM CHI TIẾT & XUẤT HOÁ ĐƠN */}
      {viewingSession && (
        <RoomExpenseDetailModal
          session={viewingSession}
          onClose={() => setViewingSession(null)}
          onEdit={() => {
            const s = viewingSession
            setViewingSession(null)
            handleOpenEditModal(s)
          }}
          onCopy={() => handleCopyBill(viewingSession)}
          onToggleSettled={() => {
            handleToggleSettled(viewingSession)
            setViewingSession((prev) => (prev ? { ...prev, isSettled: !prev.isSettled } : null))
          }}
          billCaptureRef={billCaptureRef}
          onDownloadImage={handleDownloadBillImage}
        />
      )}
    </div>
  )
}

/** Component Modal Tạo & Sửa Phiên Chi Phí Trọ */
function RoomExpenseEditModal({ session, onClose, onSave, setSession }) {
  const summary = useMemo(() => calculateRoomExpenseSummary(session), [session])

  // Helper to add item to Quân's list
  const handleAddQuanItem = (name = '', amount = '', split = 'both') => {
    setSession((prev) => ({
      ...prev,
      quanExpenses: [
        ...(prev.quanExpenses || []),
        { id: crypto.randomUUID(), name, amount, split },
      ],
    }))
  }

  // Helper to add item to Trí's list
  const handleAddTriItem = (name = '', amount = '', split = 'both') => {
    setSession((prev) => ({
      ...prev,
      triExpenses: [
        ...(prev.triExpenses || []),
        { id: crypto.randomUUID(), name, amount, split },
      ],
    }))
  }

  // Update item in list
  const handleUpdateItem = (listKey, index, field, value) => {
    setSession((prev) => {
      const list = [...(prev[listKey] || [])]
      list[index] = { ...list[index], [field]: value }
      return { ...prev, [listKey]: list }
    })
  }

  // Remove item from list
  const handleRemoveItem = (listKey, index) => {
    setSession((prev) => {
      const list = [...(prev[listKey] || [])]
      list.splice(index, 1)
      return { ...prev, [listKey]: list }
    })
  }

  return (
    <div className="modal-backdrop" style={{ pointerEvents: 'auto', zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          width: '96vw',
          maxWidth: '1440px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 24px',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={22} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              {session.createdAt && session.updatedAt ? 'Chỉnh sửa phiên chi phí trọ' : 'Tạo phiên chi phí trọ mới'}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={onSave} style={{ flex: 1, overflowY: 'auto', padding: '16px 4px 10px 4px' }}>
          {/* Top metadata inputs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
              marginBottom: 20,
              background: 'var(--bg)',
              padding: '14px 16px',
              borderRadius: 12,
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                📅 Tháng áp dụng:
              </label>
              <input
                type="month"
                value={session.month || getCurrentMonthStr()}
                onChange={(e) => {
                  const m = e.target.value
                  setSession((prev) => ({
                    ...prev,
                    month: m,
                    title: `Chi phí trọ ${formatMonthDisplay(m)}`,
                  }))
                }}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                🏷️ Tiêu đề / Tên phiên:
              </label>
              <input
                type="text"
                value={session.title || ''}
                onChange={(e) => setSession((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ví dụ: Chi phí trọ Tháng 11/2026"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                🗓️ Ngày lập hoá đơn:
              </label>
              <input
                type="date"
                value={session.date || ''}
                onChange={(e) => setSession((prev) => ({ ...prev, date: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          </div>

          {/* TWO MAIN SECTIONS: QUÂN AP & TRÍ TRẦN */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20, marginBottom: 20 }}>
            {/* ════ SECTION 1: CÁC CHI PHÍ QUÂN AP ĐÃ TRẢ ════ */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '16px',
                background: 'var(--card-bg)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: '#3B82F6',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                    }}
                  >
                    Q
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
                      Chi phí {session.payer1 || 'Quân AP'} đã trả
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Tổng Quân đã chi: <strong style={{ color: '#3B82F6' }}>{formatVND(summary.totalQuanPaid)}</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => handleAddQuanItem('', '', 'both')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={14} /> Thêm khoản chi
                </button>
              </div>

              {/* Quick Preset Chips for Quân */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                  Thêm nhanh khoản chi phí:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {COMMON_EXPENSE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleAddQuanItem(preset.name, '', preset.defaultSplit)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>{preset.icon}</span> {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* List of items */}
              {(session.quanExpenses || []).length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: 'var(--bg)',
                    borderRadius: 8,
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                  }}
                >
                  Chưa có khoản chi nào của Quân. Nhấn vào các gợi ý bên trên hoặc nút &quot;Thêm khoản chi&quot;.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(session.quanExpenses || []).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                        background: 'var(--bg)',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Tên khoản chi..."
                        value={item.name}
                        onChange={(e) => handleUpdateItem('quanExpenses', idx, 'name', e.target.value)}
                        style={{
                          flex: '2.5 1 200px',
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: 'var(--card-bg)',
                          color: 'var(--text)',
                          fontSize: '0.9rem',
                        }}
                      />

                      <div style={{ flex: '1.6 1 130px', position: 'relative' }}>
                        <input
                          type="number"
                          placeholder="Số tiền (đ)"
                          value={item.amount}
                          onChange={(e) => handleUpdateItem('quanExpenses', idx, 'amount', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'var(--card-bg)',
                            color: 'var(--text)',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                          }}
                        />
                      </div>

                      <select
                        value={item.split || 'both'}
                        onChange={(e) => handleUpdateItem('quanExpenses', idx, 'split', e.target.value)}
                        title="Cách phân chia chi phí"
                        style={{
                          flex: '1.8 1 170px',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: 'var(--card-bg)',
                          color: 'var(--text)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        <option value="both">Chia đôi (50/50)</option>
                        <option value="tri_only">Quân trả hộ Trí (Trí 100%)</option>
                        <option value="quan_only">Khoản riêng Quân (Quân 100%)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem('quanExpenses', idx)}
                        title="Xoá hàng này"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: 6,
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ════ SECTION 2: CÁC CHI PHÍ TRÍ TRẦN ĐÃ TRẢ ════ */}
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '16px',
                background: 'var(--card-bg)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: '#F59E0B',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                    }}
                  >
                    T
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
                      Chi phí {session.payer2 || 'Trí Trần'} đã trả
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Tổng Trí đã chi: <strong style={{ color: '#F59E0B' }}>{formatVND(summary.totalTriPaid)}</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => handleAddTriItem('', '', 'both')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={14} /> Thêm khoản chi
                </button>
              </div>

              {/* Quick Preset Chips for Trí */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                  Thêm nhanh khoản chi phí:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {COMMON_EXPENSE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleAddTriItem(preset.name, '', preset.defaultSplit)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>{preset.icon}</span> {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* List of items */}
              {(session.triExpenses || []).length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: 'var(--bg)',
                    borderRadius: 8,
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                  }}
                >
                  Chưa có khoản chi nào của Trí. Nhấn vào các gợi ý bên trên hoặc nút &quot;Thêm khoản chi&quot;.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(session.triExpenses || []).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        background: 'var(--bg)',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Tên khoản chi..."
                        value={item.name}
                        onChange={(e) => handleUpdateItem('triExpenses', idx, 'name', e.target.value)}
                        style={{
                          flex: 2,
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: 'var(--card-bg)',
                          color: 'var(--text)',
                          fontSize: '0.85rem',
                        }}
                      />

                      <div style={{ flex: 1.5, position: 'relative' }}>
                        <input
                          type="number"
                          placeholder="Số tiền (đ)"
                          value={item.amount}
                          onChange={(e) => handleUpdateItem('triExpenses', idx, 'amount', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'var(--card-bg)',
                            color: 'var(--text)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                          }}
                        />
                      </div>

                      <select
                        value={item.split || 'both'}
                        onChange={(e) => handleUpdateItem('triExpenses', idx, 'split', e.target.value)}
                        title="Cách phân chia chi phí"
                        style={{
                          flex: 1.8,
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: 'var(--card-bg)',
                          color: 'var(--text)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        <option value="both">Chia đôi (50/50)</option>
                        <option value="quan_only">Trí trả hộ Quân (Quân 100%)</option>
                        <option value="tri_only">Khoản riêng Trí (Trí 100%)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem('triExpenses', idx)}
                        title="Xoá hàng này"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* REAL-TIME LIVE CALCULATION & SETTLEMENT RESULT BOX */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.08) 0%, rgba(37, 99, 235, 0.08) 100%)',
              border: '2px solid var(--primary)',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} style={{ color: 'var(--primary)' }} />
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
                  Bảng tính & Kết luận quyết toán trực tiếp
                </h4>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>
                Tổng kinh phí: <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>{formatVND(summary.totalExpense)}</strong>
              </div>
            </div>

            {/* Comparison line */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
                fontSize: '0.85rem',
                marginBottom: summary.settlement.direction !== 'balanced' ? 14 : 0,
                background: 'var(--card-bg)',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            >
              <div>
                👤 <strong>{summary.payer1}</strong>: Đã trả {formatVND(summary.totalQuanPaid)} — Chịu{' '}
                <strong style={{ color: '#3B82F6' }}>{formatVND(summary.quanShare)}</strong>
              </div>
              <div>
                👤 <strong>{summary.payer2}</strong>: Đã trả {formatVND(summary.totalTriPaid)} — Chịu{' '}
                <strong style={{ color: '#F59E0B' }}>{formatVND(summary.triShare)}</strong>
              </div>
            </div>

            {/* High-visibility conclusion box (chỉ hiển thị khi có khoản cần chuyển) */}
            {summary.settlement.direction !== 'balanced' && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: 'rgba(249, 115, 22, 0.15)',
                  border: '1px solid rgba(249, 115, 22, 0.4)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
                  👉 <strong style={{ color: 'var(--accent)' }}>{summary.settlement.from}</strong> cần chuyển khoản cho{' '}
                  <strong style={{ color: 'var(--primary)' }}>{summary.settlement.to}</strong>:{' '}
                  <span style={{ color: 'var(--accent)', fontSize: '1.35rem' }}>{formatVND(summary.settlement.amount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Settle Status Checkbox & Note */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 12 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
              <input
                type="checkbox"
                checked={Boolean(session.isSettled)}
                onChange={(e) => setSession((prev) => ({ ...prev, isSettled: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              Đánh dấu phiên này là &quot;Đã thanh toán / quyết toán xong&quot;
            </label>

            <input
              type="text"
              placeholder="Ghi chú thêm (nếu có)..."
              value={session.note || ''}
              onChange={(e) => setSession((prev) => ({ ...prev, note: e.target.value }))}
              style={{
                flex: 1,
                minWidth: 240,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {/* Modal Footer Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
            }}
          >
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 24px', fontWeight: 700 }}>
              Lưu phiên chi phí
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** Component Modal Xem Chi Tiết Hoá Đơn & Xuất File / Sao Chép */
function RoomExpenseDetailModal({
  session,
  onClose,
  onEdit,
  onCopy,
  onToggleSettled,
  billCaptureRef,
  onDownloadImage,
}) {
  const summary = calculateRoomExpenseSummary(session)
  const monthDisplay = formatMonthDisplay(session.month)
  const allExpenses = [
    ...(session.quanExpenses || []).map((item) => ({ ...item, payer: summary.payer1 })),
    ...(session.triExpenses || []).map((item) => ({ ...item, payer: summary.payer2 })),
  ]
  const essentialKeywords = ['tiền phòng', 'tiền điện', 'tiền nước sinh hoạt', 'tiền wifi / internet', 'wifi', 'internet']
  const isEssentialExpense = (item) => {
    const normalizedName = String(item.name || '').toLocaleLowerCase('vi')
    return essentialKeywords.some((keyword) => normalizedName.includes(keyword))
  }
  const essentialExpenses = allExpenses.filter(isEssentialExpense)
  const regularExpenses = allExpenses.filter((item) => !isEssentialExpense(item))
  const essentialTotal = essentialExpenses.reduce((total, item) => total + (Number(item.amount) || 0), 0)
  const largestExpense = allExpenses.reduce((largest, item) =>
    (Number(item.amount) || 0) > (Number(largest?.amount) || 0) ? item : largest, null)
  const averageExpense = allExpenses.length ? summary.totalExpense / allExpenses.length : 0

  const getSplitLabel = (item) => {
    if (!item.split || item.split === 'both') return 'Chia đôi'
    const beneficiary = item.split === 'quan_only' ? summary.payer1 : summary.payer2
    return item.payer === beneficiary ? `Riêng ${beneficiary}` : `Hộ ${beneficiary} 100%`
  }

  const renderExpenseTable = (items, showPayer = false) => (
    <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: 10 }}>
      <table style={{ width: '100%', minWidth: showPayer ? 560 : 460, borderCollapse: 'collapse', fontSize: '0.86rem' }}>
        <thead>
          <tr style={{ background: '#1E293B', color: '#94A3B8', textAlign: 'left' }}>
            <th style={{ padding: '10px 12px', fontWeight: 700 }}>Khoản chi</th>
            {showPayer && <th style={{ padding: '10px 12px', fontWeight: 700 }}>Người thanh toán</th>}
            <th style={{ padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>Thể loại</th>
            <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>Số tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.id || item.name}-${item.payer}-${index}`} style={{ borderTop: '1px solid #334155' }}>
              <td style={{ padding: '10px 12px', color: '#E2E8F0', fontWeight: 600 }}>{item.name}</td>
              {showPayer && <td style={{ padding: '10px 12px', color: '#CBD5E1' }}>{item.payer}</td>}
              <td style={{ padding: '10px 12px' }}>
                <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, background: item.split === 'both' || !item.split ? 'rgba(56, 189, 248, 0.14)' : 'rgba(251, 191, 36, 0.14)', color: item.split === 'both' || !item.split ? '#7DD3FC' : '#FCD34D', fontSize: '0.76rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {getSplitLabel(item)}
                </span>
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#F8FAFC', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatVND(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="modal-backdrop" style={{ pointerEvents: 'auto', zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          width: 'min(1380px, calc(100vw - 32px))',
          maxWidth: '1380px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 16,
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'var(--card-bg)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
              Chi tiết hoá đơn phòng trọ
            </h3>
          </div>
          <button className="modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {/* Scrollable Bill Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Printable / Capturable Bill Box */}
          <div
            ref={billCaptureRef}
            style={{
              background: '#0F172A',
              color: '#F8FAFC',
              borderRadius: 16,
              padding: '28px clamp(18px, 3vw, 40px)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              border: '1px solid #334155',
            }}
          >
            {/* Bill Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #475569', paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                BẢNG QUYẾT TOÁN CHI PHÍ TRỌ
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38BDF8', margin: '4px 0 6px 0' }}>
                {session.title || `Chi phí trọ ${monthDisplay}`}
              </h2>
              <div style={{ fontSize: '0.85rem', color: '#CBD5E1', display: 'flex', justifyContent: 'center', gap: 12 }}>
                <span>📅 {monthDisplay}</span>
                {session.date && <span>• Ngày: {session.date}</span>}
              </div>
              <div style={{ marginTop: 8 }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: session.isSettled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                    color: session.isSettled ? '#4ADE80' : '#FB923C',
                    border: session.isSettled ? '1px solid #4ADE80' : '1px solid #FB923C',
                  }}
                >
                  {session.isSettled ? '✅ ĐÃ HOÀN TẤT THANH TOÁN' : '⏳ CHỜ CHUYỂN KHOẢN'}
                </span>
              </div>
            </div>

            {/* Overview metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 22 }}>
              {[
                { label: 'Tổng chi phí', value: formatVND(summary.totalExpense), detail: `${allExpenses.length} khoản chi`, color: '#4ADE80' },
                { label: 'Chi phí thiết yếu', value: formatVND(essentialTotal), detail: `${summary.totalExpense ? Math.round((essentialTotal / summary.totalExpense) * 100) : 0}% tổng bill`, color: '#38BDF8' },
                { label: 'Bình quân / khoản', value: formatVND(averageExpense), detail: 'Tổng bill ÷ số khoản', color: '#C4B5FD' },
                { label: 'Khoản cao nhất', value: largestExpense ? formatVND(largestExpense.amount) : '—', detail: largestExpense?.name || 'Chưa có dữ liệu', color: '#FBBF24' },
                { label: `Phần ${summary.payer1}`, value: formatVND(summary.quanShare), detail: `Đã thanh toán ${formatVND(summary.totalQuanPaid)}`, color: '#60A5FA' },
                { label: `Phần ${summary.payer2}`, value: formatVND(summary.triShare), detail: `Đã thanh toán ${formatVND(summary.totalTriPaid)}`, color: '#FBBF24' },
              ].map((metric) => (
                <div key={metric.label} style={{ padding: '14px 15px', borderRadius: 12, background: '#1E293B', border: '1px solid #334155', minWidth: 0 }}>
                  <div style={{ color: '#94A3B8', fontSize: '0.77rem', fontWeight: 700, marginBottom: 7 }}>{metric.label}</div>
                  <div style={{ color: metric.color, fontSize: '1.1rem', fontWeight: 800, overflowWrap: 'anywhere' }}>{metric.value}</div>
                  <div style={{ color: '#64748B', fontSize: '0.74rem', marginTop: 5 }}>{metric.detail}</div>
                </div>
              ))}
            </div>

            {/* Highlight rent and recurring utilities separately */}
            <section style={{ marginBottom: 22, padding: 16, borderRadius: 14, background: 'linear-gradient(135deg, rgba(14, 116, 144, 0.2), rgba(30, 41, 59, 0.75))', border: '1px solid rgba(56, 189, 248, 0.45)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <div>
                  <div style={{ color: '#7DD3FC', fontSize: '1rem', fontWeight: 800 }}>🏠 Tiền phòng & dịch vụ thiết yếu</div>
                  <div style={{ color: '#94A3B8', fontSize: '0.78rem', marginTop: 3 }}>Tiền phòng, điện, nước sinh hoạt, Wifi / Internet</div>
                </div>
                <strong style={{ color: '#7DD3FC', fontSize: '1.15rem' }}>{formatVND(essentialTotal)}</strong>
              </div>
              {essentialExpenses.length ? renderExpenseTable(essentialExpenses, true) : (
                <div style={{ color: '#64748B', fontSize: '0.84rem', fontStyle: 'italic' }}>Chưa có khoản tiền phòng hoặc dịch vụ thiết yếu.</div>
              )}
            </section>

            {/* Other expenses grouped by payer */}
            {[
              { payer: summary.payer1, color: '#60A5FA', expenses: regularExpenses.filter((item) => item.payer === summary.payer1) },
              { payer: summary.payer2, color: '#FBBF24', expenses: regularExpenses.filter((item) => item.payer === summary.payer2) },
            ].map((group) => (
              <section key={group.payer} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: 8, marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, color: group.color, fontSize: '0.95rem' }}>👤 {group.payer.toUpperCase()} — CÁC KHOẢN KHÁC</span>
                  <span style={{ fontWeight: 800, color: group.color }}>{formatVND(group.expenses.reduce((total, item) => total + (Number(item.amount) || 0), 0))}</span>
                </div>
                {group.expenses.length ? renderExpenseTable(group.expenses) : (
                  <div style={{ color: '#64748B', fontSize: '0.82rem', fontStyle: 'italic' }}>Không có khoản chi khác.</div>
                )}
              </section>
            ))}

            {/* Total & Summary Breakdown Table */}
            <div style={{ background: '#1E293B', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.95rem' }}>
                <span style={{ color: '#94A3B8' }}>📊 Tổng chi phí tháng:</span>
                <strong style={{ color: '#4ADE80', fontSize: '1.1rem' }}>{formatVND(summary.totalExpense)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#CBD5E1', marginBottom: 4 }}>
                <span>• Trách nhiệm {summary.payer1}:</span>
                <span>{formatVND(summary.quanShare)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#CBD5E1' }}>
                <span>• Trách nhiệm {summary.payer2}:</span>
                <span>{formatVND(summary.triShare)}</span>
              </div>
            </div>

            {/* Grand Conclusion Result */}
            <div
              style={{
                background: summary.settlement.direction === 'balanced' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                border: summary.settlement.direction === 'balanced' ? '1px solid #22C55E' : '1px solid #F97316',
                borderRadius: 12,
                padding: '14px 16px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                HƯỚNG THANH TOÁN
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {summary.settlement.direction === 'balanced' ? (
                  <span style={{ color: '#4ADE80' }}>🎉 Hai bên đã cân bằng chi phí (0đ)</span>
                ) : (
                  <span>
                    👉 <span style={{ color: '#FB923C' }}>{summary.settlement.from}</span> cần chuyển cho{' '}
                    <span style={{ color: '#4ADE80' }}>{summary.settlement.to}</span>:{' '}
                    <span style={{ color: '#FB923C', fontSize: '1.3rem' }}>{formatVND(summary.settlement.amount)}</span>
                  </span>
                )}
              </div>
            </div>

            {session.note && (
              <div style={{ marginTop: 12, fontSize: '0.8rem', color: '#94A3B8', textAlign: 'center', fontStyle: 'italic' }}>
                Ghi chú: {session.note}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--card-bg)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onToggleSettled}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {session.isSettled ? <Clock size={15} /> : <CheckCircle2 size={15} />}
            {session.isSettled ? 'Đổi thành Chờ thanh toán' : 'Đánh dấu Đã thanh toán'}
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onCopy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Copy size={15} /> Sao chép tin nhắn
            </button>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onDownloadImage}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={15} /> Tải ảnh hoá đơn
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onEdit}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Pencil size={15} /> Sửa phiên
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

