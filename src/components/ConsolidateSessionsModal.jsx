import { useState, useMemo, useEffect, Fragment } from 'react'
import { createPortal } from 'react-dom'
import html2canvas from 'html2canvas'
import { Download, X, QrCode, Check, Calendar, Users, Wallet, FileText, Calculator, ChevronDown, ChevronUp } from 'lucide-react'
import { formatMoney, calculateTotals, getEntryLabel, sortPlayerNames } from '../constants'
import paymentQrImage from '../files/qr-code.jpeg'

const WEEKDAY_LABELS = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

function formatDateShort(dateInput) {
  const date = new Date(dateInput || Date.now())
  if (Number.isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function formatSessionTitleDate(dateInput) {
  const date = new Date(dateInput || Date.now())
  if (Number.isNaN(date.getTime())) return ''
  const weekday = WEEKDAY_LABELS[date.getDay()] || ''
  return `${weekday}, ${formatDateShort(dateInput)}`
}

export default function ConsolidateSessionsModal({ sessions = [], players = [], expenseTypes = [], onClose }) {
  // Lock body scroll when modal is open
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [])
  // Sort selected sessions by date ascending
  const sortedSessions = useMemo(() => {
    return (sessions || []).slice().sort((a, b) => {
      const ta = a && a.date ? new Date(a.date).getTime() : 0
      const tb = b && b.date ? new Date(b.date).getTime() : 0
      return ta - tb
    })
  }, [sessions])

  const idToName = useMemo(() => {
    return Object.fromEntries((players || []).map((p) => [String(p.id), p.name]))
  }, [players])

  const getName = (p) => {
    if (!p && p !== 0) return ''
    if (typeof p === 'object') return p.name || String(p.id)
    return idToName[String(p)] || String(p)
  }

  // Precompute per-session normalized entries & totals
  const normalizedSessions = useMemo(() => {
    return sortedSessions.map((session) => {
      const normalizedEntries = (session.entries || []).map((e) => {
        const peopleObjs = (e.people || []).map((p) => ({
          id: typeof p === 'object' ? String(p.id) : String(p),
          name: getName(p)
        }))
        const peopleNames = peopleObjs.map((p) => p.name)
        const payerName = typeof e.payer === 'object' ? (e.payer.name || String(e.payer.id)) : getName(e.payer)

        return {
          ...e,
          payer: payerName,
          peopleObjs,
          people: peopleNames
        }
      })

      const totalsRaw = calculateTotals(normalizedEntries)
      const totals = Object.fromEntries(
        Object.entries(totalsRaw).map(([k, v]) => [getName(k) || k, v])
      )
      const sessionTotal = Object.values(totals).reduce((sum, v) => sum + v, 0)

      return {
        ...session,
        normalizedEntries,
        totals,
        sessionTotal
      }
    })
  }, [sortedSessions, idToName])

  // Total combined expense across all selected sessions
  const combinedTotal = useMemo(() => {
    return normalizedSessions.reduce((sum, s) => sum + s.sessionTotal, 0)
  }, [normalizedSessions])

  // Date Range Label
  const dateRangeLabel = useMemo(() => {
    if (sortedSessions.length === 0) return ''
    if (sortedSessions.length === 1) return formatSessionTitleDate(sortedSessions[0].date)
    const firstDate = formatDateShort(sortedSessions[0].date)
    const lastDate = formatDateShort(sortedSessions[sortedSessions.length - 1].date)
    return `${firstDate} — ${lastDate}`
  }, [sortedSessions])

  // Aggregated Per-Player Data across ALL selected sessions
  const aggregatedPlayersData = useMemo(() => {
    const map = {}

    for (const session of normalizedSessions) {
      for (const entry of session.normalizedEntries) {
        // Track payer's upfront payment
        const payerName = entry.payer
        if (payerName) {
          if (!map[payerName]) {
            map[payerName] = { name: payerName, totalShare: 0, totalPaid: 0, sessionCount: new Set() }
          }
          map[payerName].totalPaid += Number(entry.amount) || 0
        }

        // Track shares for people assigned to expense
        const people = entry.people || []
        const shareCount = people.length
        if (shareCount > 0 && entry.amount > 0) {
          const amounts = Array.isArray(entry.amounts) ? entry.amounts : []
          for (let i = 0; i < shareCount; i++) {
            const pName = people[i]
            if (!pName) continue
            const share = amounts.length === shareCount ? Number(amounts[i]) : entry.amount / shareCount
            if (!Number.isFinite(share) || share <= 0) continue

            if (!map[pName]) {
              map[pName] = { name: pName, totalShare: 0, totalPaid: 0, sessionCount: new Set() }
            }
            map[pName].totalShare += share
            map[pName].sessionCount.add(session.id)
          }
        }
      }
    }

    const result = Object.values(map).map((item) => ({
      ...item,
      netOwe: item.totalShare - item.totalPaid, // Positive = owes money, Negative = paid extra upfront
      sessionCountNum: item.sessionCount.size
    })).sort((a, b) => b.totalShare - a.totalShare)

    return result
  }, [normalizedSessions])

  // All involved player names
  const allPlayerNames = useMemo(() => {
    return aggregatedPlayersData.map((p) => p.name)
  }, [aggregatedPlayersData])

  // Unique actual participants across ALL selected sessions (only those who actually played/shared expenses)
  const actualParticipants = useMemo(() => {
    const set = new Set()
    for (const session of normalizedSessions) {
      for (const entry of session.normalizedEntries) {
        for (const pName of entry.people || []) {
          if (pName) set.add(pName)
        }
      }
    }
    return Array.from(set)
  }, [normalizedSessions])

  // Default transfer recipient: Most frequent payer across selected sessions
  const defaultTransferTo = useMemo(() => {
    const counts = {}
    for (const s of normalizedSessions) {
      for (const e of s.normalizedEntries) {
        if (e.payer) {
          counts[e.payer] = (counts[e.payer] || 0) + 1
        }
      }
    }
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return ranked[0]?.[0] || allPlayerNames[0] || ''
  }, [normalizedSessions, allPlayerNames])

  const [transferTo, setTransferTo] = useState(defaultTransferTo)
  const [includeQrCode, setIncludeQrCode] = useState(true)
  const [settledPlayers, setSettledPlayers] = useState([])
  const [exportingImage, setExportingImage] = useState(false)
  const [collapsedSessions, setCollapsedSessions] = useState({})

  const toggleSessionCollapse = (sessionId) => {
    setCollapsedSessions((prev) => ({ ...prev, [sessionId]: !prev[sessionId] }))
  }

  const handleToggleSettled = (name) => {
    setSettledPlayers((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    )
  }

  const settlablePlayers = useMemo(() => {
    return aggregatedPlayersData
      .filter((p) => p.name !== transferTo && p.netOwe > 0)
      .map((p) => p.name)
  }, [aggregatedPlayersData, transferTo])

  const allSettled = useMemo(() => {
    return (
      settlablePlayers.length > 0 &&
      settlablePlayers.every((name) => settledPlayers.includes(name))
    )
  }, [settlablePlayers, settledPlayers])

  const handleToggleAllSettled = () => {
    if (allSettled) {
      const settlableSet = new Set(settlablePlayers)
      setSettledPlayers((prev) => prev.filter((p) => !settlableSet.has(p)))
    } else {
      setSettledPlayers((prev) => Array.from(new Set([...prev, ...settlablePlayers])))
    }
  }

  // Combined Image Export Generator
  const generateConsolidatedBillImage = async () => {
    const wrapper = document.createElement('div')
    wrapper.style.position = 'absolute'
    wrapper.style.left = '-9999px'
    wrapper.style.top = '0'
    wrapper.style.width = '880px'
    wrapper.style.background = '#F1F5F9'
    wrapper.style.padding = '20px'
    wrapper.style.fontFamily = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    wrapper.style.boxSizing = 'border-box'

    const showQrCode = Boolean(transferTo && includeQrCode)

    wrapper.innerHTML = `
      <div style="background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.12); border: 1.5px solid #E2E8F0;">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #15803D 0%, #16A34A 50%, #22C55E 100%); padding: 24px 28px; color: #FFFFFF; position: relative;">
          <div style="height: 5px; background: linear-gradient(90deg, #4ADE80, #FACC15, #38BDF8); position: absolute; top: 0; left: 0; right: 0;"></div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.75rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #DCFCE7; margin-bottom: 4px;">⚡ SMASH CALCULATOR</div>
              <div style="font-size: 1.4rem; font-weight: 800; color: #FFFFFF; letter-spacing: -0.01em;">🏸 PHIẾU TÍNH TIỀN GỘP (${normalizedSessions.length} PHIÊN CẦU)</div>
              <div style="font-size: 0.88rem; color: #F0FDF4; font-weight: 600; margin-top: 4px;">📅 ${dateRangeLabel}</div>
            </div>
            <div style="background: rgba(255,255,255,0.2); padding: 10px 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.3); text-align: right;">
              <div style="font-size: 0.72rem; color: #DCFCE7; font-weight: 700;">TỔNG KINH PHÍ GỘP</div>
              <div style="font-size: 1.35rem; font-weight: 800; color: #FFFFFF;">${formatMoney(Math.round(combinedTotal * 1000))}</div>
            </div>
          </div>
        </div>

        <!-- Content Container -->
        <div style="padding: 24px;">
          <!-- 3 Stat Cards -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px;">
            <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 14px; padding: 12px 16px;">
              <div style="font-size: 0.72rem; font-weight: 700; color: #15803D;">🏸 Số phiên cầu gộp</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${normalizedSessions.length} phiên đánh</div>
            </div>
            <div style="background: #FEF3C7; border: 1.5px solid #FDE68A; border-radius: 14px; padding: 12px 16px;">
              <div style="font-size: 0.72rem; font-weight: 700; color: #B45309;">👥 Tổng số tay vợt</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${actualParticipants.length} thành viên</div>
            </div>
            <div style="background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: 14px; padding: 12px 16px;">
              <div style="font-size: 0.72rem; font-weight: 700; color: #1D4ED8;">🏦 Chuyển khoản cho</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin-top: 2px; white-space: nowrap;">${transferTo || 'Chưa chọn'}</div>
            </div>
          </div>

          <!-- Section I: Breakdown per Session -->
          <div style="margin-bottom: 24px;">
            <div style="font-size: 0.95rem; font-weight: 800; color: #0F172A; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              📋 CHI TIẾT CÁC KHOẢN CHI TỪNG PHIÊN CẦU
            </div>
            ${normalizedSessions.map((s, idx) => `
              <div style="margin-bottom: 16px; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
                <div style="background: #F8FAFC; padding: 10px 14px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 800; font-size: 0.86rem; color: #0F172A;">
                    Phiên #${idx + 1}: ${formatSessionTitleDate(s.date)}
                  </span>
                  <span style="font-weight: 800; font-size: 0.86rem; color: #16A34A;">
                    ${formatMoney(Math.round(s.sessionTotal * 1000))}
                  </span>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; table-layout: fixed;">
                  <colgroup>
                    <col style="width: 32%;" />
                    <col style="width: 20%;" />
                    <col style="width: 18%;" />
                    <col style="width: 15%;" />
                    <col style="width: 15%;" />
                  </colgroup>
                  <thead>
                    <tr style="background: #FFFFFF; color: #64748B; border-bottom: 1px solid #E2E8F0; text-align: left;">
                      <th style="padding: 8px 12px;">Khoản chi</th>
                      <th style="padding: 8px 12px;">Người trả</th>
                      <th style="padding: 8px 12px; text-align: right;">Số tiền</th>
                      <th style="padding: 8px 12px; text-align: center;">Tham gia</th>
                      <th style="padding: 8px 12px; text-align: right;">Chia lẻ</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${s.normalizedEntries.map((e) => {
                      const perPerson = (Array.isArray(e.amounts) && e.amounts.length === e.people.length)
                        ? e.amounts.reduce((sum, v) => sum + Number(v || 0), 0)
                        : (e.people.length > 0 ? e.amount / e.people.length : 0)
                      return `
                        <tr style="border-bottom: 1px solid #F1F5F9;">
                          <td style="padding: 8px 12px; font-weight: 700; color: #0F172A; word-break: break-word;">${getEntryLabel(e, expenseTypes)}</td>
                          <td style="padding: 8px 12px; color: #334155;">${e.payer}</td>
                          <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #0F172A;">${formatMoney(Math.round(e.amount * 1000))}</td>
                          <td style="padding: 8px 12px; text-align: center; color: #64748B;">${e.people.length} người</td>
                          <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #16A34A;">${formatMoney(Math.round(perPerson * 1000))}</td>
                        </tr>
                      `
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `).join('')}
          </div>

          <!-- Section II: Combined Final Settlement Table -->
          <div style="margin-bottom: 20px;">
            <div style="font-size: 0.95rem; font-weight: 800; color: #0F172A; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              💵 BẢNG TỔNG HỢP TIỀN CHO TỪNG NGƯỜI (${normalizedSessions.length} PHIÊN)
            </div>
            <table style="width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; font-size: 0.83rem; table-layout: fixed;">
              <colgroup>
                <col style="width: 28%;" />
                <col style="width: 16%;" />
                <col style="width: 16%;" />
                <col style="width: 24%;" />
                <col style="width: 16%;" />
              </colgroup>
              <thead>
                <tr style="background: #F8FAFC; color: #475569; border-bottom: 1.5px solid #E2E8F0; text-align: left;">
                  <th style="padding: 10px 12px;">Vận động viên</th>
                  <th style="padding: 10px 12px; text-align: right;">Tổng chi phí</th>
                  <th style="padding: 10px 12px; text-align: right;">Đã ứng trước</th>
                  <th style="padding: 10px 12px; text-align: right; line-height: 1.25;">
                    <div style="font-size: 0.68rem; color: #64748B; font-weight: 700;">CẦN CHUYỂN CHO</div>
                    <div style="color: #15803D; font-weight: 800;">${transferTo || 'Trưởng nhóm'}</div>
                  </th>
                  <th style="padding: 10px 12px; text-align: center;">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                ${aggregatedPlayersData.map((p) => {
                  const isTransferTarget = p.name === transferTo
                  const isSettled = settledPlayers.includes(p.name)
                  const oweAmountToTarget = isTransferTarget ? 0 : Math.max(0, p.netOwe)

                  return `
                    <tr style="border-bottom: 1px solid #F1F5F9; background: ${isTransferTarget ? '#F0FDF4' : '#FFFFFF'};">
                      <td style="padding: 10px 12px; font-weight: 700; color: ${isTransferTarget ? '#15803D' : '#0F172A'};">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%;">
                          <span>${p.name}</span>
                          ${isTransferTarget ? '<span style="font-size: 0.64rem; background: #DCFCE7; color: #15803D; padding: 2px 7px; border-radius: 999px; font-weight: 800; flex-shrink: 0;">Người nhận</span>' : ''}
                        </div>
                      </td>
                      <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0F172A;">${formatMoney(Math.round(p.totalShare * 1000))}</td>
                      <td style="padding: 10px 12px; text-align: right; color: #64748B;">${p.totalPaid > 0 ? formatMoney(Math.round(p.totalPaid * 1000)) : '-'}</td>
                      <td style="padding: 10px 12px; text-align: right; font-weight: 800; color: ${oweAmountToTarget > 0 ? '#EA580C' : '#16A34A'};">
                        ${isTransferTarget ? '0 VND (Nhận tiền)' : (oweAmountToTarget > 0 ? formatMoney(Math.round(oweAmountToTarget * 1000)) : '0 VND')}
                      </td>
                      <td style="padding: 10px 12px; text-align: center;">
                        ${isSettled || isTransferTarget
                          ? '<span style="font-size: 0.72rem; font-weight: 800; color: #15803D; background: #DCFCE7; padding: 3px 8px; border-radius: 999px;">✓ Đã xong</span>'
                          : '<span style="font-size: 0.72rem; font-weight: 800; color: #D97706; background: #FEF3C7; padding: 3px 8px; border-radius: 999px;">💳 Chờ CK</span>'
                        }
                      </td>
                    </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Section III: Payment QR Code & Footer -->
          ${showQrCode ? `
            <div style="background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%); border: 1.5px solid #CBD5E1; border-radius: 14px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
              <div>
                <div style="font-size: 0.75rem; font-weight: 800; color: #15803D; letter-spacing: 0.05em; text-transform: uppercase;">
                  📲 THÔNG TIN CHUYỂN KHOẢN TỔNG
                </div>
                <div style="font-size: 0.95rem; font-weight: 800; color: #0F172A; margin-top: 2px;">
                  Chuyển khoản gộp cho: <span style="color: #16A34A;">${transferTo}</span>
                </div>
                <div style="font-size: 0.78rem; color: #64748B; margin-top: 4px;">
                  Nội dung CK: <strong style="color: #0F172A;">[Tên_Của_Bạn] Gui tien cau long gop (${normalizedSessions.length} phien)</strong>
                </div>
              </div>
              <img src="${paymentQrImage}" alt="QR Code" style="width: 90px; height: 90px; object-fit: cover; border-radius: 10px; border: 2px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
            </div>
          ` : ''}

          <div style="text-align: center; margin-top: 18px; font-size: 0.72rem; color: #94A3B8; font-weight: 600;">
            Phiếu tính tiền gộp được tạo tự động bởi Smash Calculator • ${new Date().toLocaleDateString('vi-VN')}
          </div>
        </div>
      </div>
    `

    document.body.appendChild(wrapper)

    try {
      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      })

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          document.body.removeChild(wrapper)
          resolve(blob)
        }, 'image/png')
      })
    } catch (err) {
      document.body.removeChild(wrapper)
      throw err
    }
  }

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
        overscrollBehavior: 'contain',
        pointerEvents: 'auto',
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1550px',
          width: '98%',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '24px 24px 16px 24px',
          background: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(15, 23, 42, 0.25)',
          border: '1px solid #E2E8F0',
          margin: 'auto',
        }}
      >
        {/* Header (Fixed) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#16A34A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              ⚡ SMASH CALCULATOR — TÍNH TIỀN GỘP
            </div>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Phiếu Tính Tiền Gộp ({normalizedSessions.length} phiên cầu)
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              📅 Các phiên chọn: {dateRangeLabel}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onClose}
            style={{ borderRadius: '50%', padding: 6, minWidth: 'auto' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            paddingRight: '6px',
            marginBottom: 12,
          }}
        >
          {/* 3 Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ background: 'var(--color-court-green-soft)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 14 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16A34A' }}>💵 TỔNG KINH PHÍ GỘP</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 2 }}>
              {formatMoney(Math.round(combinedTotal * 1000))}
            </div>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 14 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706' }}>🏸 SỐ PHIÊN CẦU GỘP</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 2 }}>
              {normalizedSessions.length} phiên cầu
            </div>
          </div>
          <div style={{ background: 'var(--color-sports-blue-soft)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 14 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB' }}>👥 THÀNH VIÊN THAM GIA</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 2 }}>
              {actualParticipants.length} người
            </div>
          </div>
        </div>


        {/* 2-Column Responsive Grid Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(560px, 1fr))',
          gap: '24px',
          alignItems: 'start',
          marginBottom: '16px'
        }}>
          {/* Column 1: Detailed Breakdown per Session */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} style={{ color: '#16A34A' }} /> Chi tiết khoản chi từng phiên
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {normalizedSessions.map((session, sIdx) => {
                const isCollapsed = collapsedSessions[session.id]
                return (
                  <div key={session.id} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--card-bg)' }}>
                    <div
                      onClick={() => toggleSessionCollapse(session.id)}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--bg)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text-primary)' }}>
                          Phiên #{sIdx + 1}: {formatSessionTitleDate(session.date)}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          ({session.normalizedEntries.length} khoản chi)
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#16A34A' }}>
                          {formatMoney(Math.round(session.sessionTotal * 1000))}
                        </span>
                        {isCollapsed ? <ChevronDown size={18} color="#64748B" /> : <ChevronUp size={18} color="#64748B" />}
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="table-wrap" style={{ margin: 0 }}>
                        <table className="result-table" style={{ marginBottom: 0, tableLayout: 'fixed', width: '100%' }}>
                          <colgroup>
                            <col style={{ width: '28%' }} />
                            <col style={{ width: '18%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '14%' }} />
                            <col style={{ width: '20%' }} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th>Khoản chi</th>
                              <th>Người trả</th>
                              <th style={{ textAlign: 'right' }}>Số tiền</th>
                              <th style={{ textAlign: 'center' }}>Tham gia</th>
                              <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Chia lẻ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {session.normalizedEntries.map((e) => {
                              const perPerson = (Array.isArray(e.amounts) && e.amounts.length === e.people.length)
                                ? e.amounts.reduce((sum, v) => sum + Number(v || 0), 0)
                                : (e.people.length > 0 ? e.amount / e.people.length : 0)
                              return (
                                <tr key={e.id}>
                                  <td style={{ wordBreak: 'break-word' }}>{getEntryLabel(e, expenseTypes)}</td>
                                  <td style={{ wordBreak: 'break-word' }}>{e.payer}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 700, wordBreak: 'break-word' }}>{formatMoney(Math.round(e.amount * 1000))}</td>
                                  <td style={{ textAlign: 'center', color: '#64748B', wordBreak: 'break-word' }}>{e.people.length} người</td>
                                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)', wordBreak: 'break-word' }}>
                                    {formatMoney(Math.round(perPerson * 1000))}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Column 2: Combined Settlement Table */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calculator size={18} style={{ color: '#16A34A' }} /> Bảng Tổng Hợp Tiền Cho Từng Người ({normalizedSessions.length} phiên)
            </h3>

            <div className="table-wrap" style={{ background: 'var(--card-bg)', borderRadius: 12 }}>
              <table className="result-table result-table-split" style={{ marginBottom: 0, tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '18%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Vận động viên</th>
                    <th style={{ textAlign: 'right' }}>Tổng chi phí</th>
                    <th style={{ textAlign: 'right' }}>Đã ứng trước</th>
                    {transferTo ? (
                      <th style={{ color: 'var(--color-accent)', textAlign: 'right', lineHeight: 1.25, padding: '8px 10px' }}>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', fontWeight: 700 }}>CHUYỂN CHO</div>
                        <div style={{ color: 'var(--color-court-green)', fontWeight: 800, wordBreak: 'break-word' }}>{transferTo}</div>
                      </th>
                    ) : (
                      <th style={{ textAlign: 'right' }}>Cần chuyển</th>
                    )}
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '130px', minWidth: '130px' }}>
                      {settlablePlayers.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '130px' }}>
                          <label className="settle-toggle" title={allSettled ? 'Bỏ chọn tất cả' : 'Chọn tất cả đã thanh toán'} style={{ gap: '6px' }}>
                            <input
                              type="checkbox"
                              className="settle-toggle-input"
                              checked={allSettled}
                              onChange={handleToggleAllSettled}
                            />
                            <span className="settle-toggle-box" aria-hidden="true" style={{ width: '18px', height: '18px', fontSize: '0.75rem' }}>
                              ✓
                            </span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, userSelect: 'none' }}>
                              Tất cả
                            </span>
                          </label>
                        </div>
                      ) : (
                        <span>Đánh dấu</span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedPlayersData.map((p) => {
                    const isTransferTarget = p.name === transferTo
                    const isSettled = settledPlayers.includes(p.name)
                    const owe = p.netOwe
                    const canSettle = owe > 0 && !isTransferTarget

                    return (
                      <tr key={p.name} className={isTransferTarget ? 'transfer-target-row' : ''}>
                        <td style={{ fontWeight: 600, color: 'var(--color-blue)', wordBreak: 'break-word' }}>
                          <div>{p.name}</div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            ({p.sessionCountNum} phiên)
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-accent-dark)', fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>
                          {formatMoney(Math.round(p.totalShare * 1000))}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>
                          {p.totalPaid > 0 ? formatMoney(Math.round(p.totalPaid * 1000)) : '-'}
                        </td>
                        <td style={{ textAlign: 'right', wordBreak: 'break-word' }}>
                          {isTransferTarget ? (
                            <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.82rem' }}>
                              0 VND (Nhận)
                            </span>
                          ) : owe > 0 ? (
                            <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                              - {formatMoney(Math.round(owe * 1000))}
                            </span>
                          ) : owe < 0 ? (
                            <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                              + {formatMoney(Math.round(Math.abs(owe) * 1000))}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Đã hòa</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '130px', minWidth: '130px' }}>
                          {isTransferTarget ? (
                            <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.78rem', background: 'var(--color-court-green-soft)', padding: '2px 8px', borderRadius: '999px', display: 'inline-block' }}>✓ Người nhận</span>
                          ) : canSettle ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <label className="settle-toggle" aria-label={`Đánh dấu ${p.name} đã thanh toán`} style={{ gap: '6px' }}>
                                <input
                                  type="checkbox"
                                  className="settle-toggle-input"
                                  checked={isSettled}
                                  onChange={() => handleToggleSettled(p.name)}
                                />
                                <span className="settle-toggle-box" aria-hidden="true">
                                  ✓
                                </span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isSettled ? 'var(--success)' : 'var(--danger)', userSelect: 'none', display: 'inline-block', minWidth: '58px', textAlign: 'left' }}>
                                  {isSettled ? 'Paid' : 'Pending'}
                                </span>
                              </label>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="result-total">
                    <td>TỔNG GỘP ({normalizedSessions.length} PHIÊN)</td>
                    <td>{formatMoney(Math.round(combinedTotal * 1000))}</td>
                    <td>{formatMoney(Math.round(aggregatedPlayersData.reduce((s, p) => s + p.totalPaid, 0) * 1000))}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

        {/* Modal Action Buttons Footer (Fixed at bottom) */}
        <div
          style={{
            flexShrink: 0,
            borderTop: '1.5px solid var(--border)',
            paddingTop: 12,
            background: 'var(--card-bg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Transfer Recipient & QR Code Selection Toolbar Row */}
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text-primary)', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <Wallet size={16} style={{ color: '#16A34A' }} /> Người nhận CK gộp:
              </span>

              <div className="people-picker" style={{ margin: 0, display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
                {allPlayerNames.map((name) => {
                  const isSelected = transferTo === name
                  return (
                    <button
                      key={name}
                      type="button"
                      className={`people-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => setTransferTo(transferTo === name ? '' : name)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.8rem' }}
                    >
                      {isSelected && <Check size={13} strokeWidth={3} />}
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Toggle Switch for QR Code */}
            <button
              type="button"
              onClick={() => {
                const nextState = !Boolean(transferTo && includeQrCode)
                if (nextState) {
                  setIncludeQrCode(true)
                  if (!transferTo) setTransferTo(defaultTransferTo || allPlayerNames[0] || '')
                } else {
                  setIncludeQrCode(false)
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: (transferTo && includeQrCode) ? '1.5px solid #22C55E' : '1.5px solid #CBD5E1',
                background: '#FFFFFF',
                color: (transferTo && includeQrCode) ? '#15803D' : '#64748B',
                boxShadow: (transferTo && includeQrCode) ? '0 2px 8px rgba(34, 197, 94, 0.2)' : 'none',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
            >
              <QrCode size={14} color={(transferTo && includeQrCode) ? '#16A34A' : '#64748B'} />
              <span>Kèm QR Bill</span>
              <span
                style={{
                  width: '28px',
                  height: '16px',
                  borderRadius: '999px',
                  background: (transferTo && includeQrCode) ? '#16A34A' : '#CBD5E1',
                  position: 'relative',
                  display: 'inline-block',
                  transition: 'background 0.2s ease',
                }}
              >
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    position: 'absolute',
                    top: '2px',
                    left: (transferTo && includeQrCode) ? '14px' : '2px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                  }}
                />
              </span>
            </button>
          </div>

          {/* Action Buttons Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Đóng
            </button>

            <button
              type="button"
              className="btn btn-primary"
              disabled={exportingImage}
              onClick={async () => {
                try {
                  setExportingImage(true)
                  const blob = await generateConsolidatedBillImage()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `badminton-consolidated-bill-${new Date().toISOString().split('T')[0]}.png`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (e) {
                  console.error('Export consolidated bill error', e)
                } finally {
                  setExportingImage(false)
                }
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10 }}
            >
              <Download size={18} /> {exportingImage ? 'Đang xuất Bill Gộp...' : 'Export Bill Gộp (PNG)'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
