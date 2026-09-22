import { useEffect, useMemo, useState, Fragment } from 'react'
import html2canvas from 'html2canvas'
import { Download, Copy, Image as ImageIcon, ArrowLeft, Pencil, QrCode, Check, Receipt, Calculator, Calendar } from 'lucide-react'
import { formatMoney, calculateTotals, getEntryLabel, sortPlayerNames, sortExpenseTypes } from '../constants'
import paymentQrImage from '../files/qr-code.jpeg'

const BADMINTON_EXPENSE_TYPES = new Set(['san', 'cau', 'tra-da'])

const WEEKDAY_LABELS = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

const formatBillDate = (dateInput) => {
  const date = new Date(dateInput || Date.now())
  if (Number.isNaN(date.getTime())) return ''
  const weekday = WEEKDAY_LABELS[date.getDay()] || ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${weekday}, ngày ${day}/${month}/${year}`
}

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
  // Actual participants who actually shared/played in at least 1 expense entry
  const actualParticipants = useMemo(() => {
    const set = new Set()
    for (const entry of normalizedEntries) {
      for (const pName of entry.people || []) {
        if (pName) set.add(pName)
      }
    }
    return sortPlayerNames(Array.from(set))
  }, [normalizedEntries])

  // All involved individuals (actual participants + payers who paid upfront)
  const allInvolvedPlayers = useMemo(() => {
    const set = new Set(actualParticipants)
    for (const entry of normalizedEntries) {
      if (entry.payer) set.add(entry.payer)
    }
    return sortPlayerNames(Array.from(set))
  }, [actualParticipants, normalizedEntries])

  const participants = actualParticipants

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

    return ranked[0]?.[0] || allInvolvedPlayers[0] || ''
  }, [normalizedEntries, allInvolvedPlayers])
  const [activeResultTab, setActiveResultTab] = useState('entries')
  const [transferTo, setTransferTo] = useState(defaultTransferTo)
  const [includeQrCode, setIncludeQrCode] = useState(true)
  const [settledPlayers, setSettledPlayers] = useState(session.settledPlayers || [])
  const [exportingImage, setExportingImage] = useState(false)
  const [copyingImage, setCopyingImage] = useState(false)
  const [copyingText, setCopyingText] = useState(false)

  useEffect(() => {
    setSettledPlayers(session.settledPlayers || [])
  }, [session])

  const canEditSession = useMemo(
    () => allInvolvedPlayers.every((name) => !settledPlayers.includes(name)),
    [allInvolvedPlayers, settledPlayers]
  )

  // Persist `transferTo` per session in localStorage so user's choice isn't reset
  useEffect(() => {
    const key = `session.transferTo.${session.id}`
    // Priority: session.transferTo (from DB) -> localStorage -> default participant
    if (session.transferTo && allInvolvedPlayers.includes(session.transferTo)) {
      setTransferTo(session.transferTo)
      return
    }

    try {
      const stored = localStorage.getItem(key)
      if (stored && allInvolvedPlayers.includes(stored)) {
        setTransferTo(stored)
        return
      }
    } catch (e) {
      // ignore
    }

    setTransferTo(defaultTransferTo)
  }, [session.id, allInvolvedPlayers, defaultTransferTo])

  useEffect(() => {
    if (!allInvolvedPlayers.length) {
      setTransferTo('')
    } else if (transferTo && !allInvolvedPlayers.includes(transferTo)) {
      setTransferTo(defaultTransferTo || allInvolvedPlayers[0])
    }
  }, [allInvolvedPlayers, transferTo, defaultTransferTo])

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

  const settlablePlayers = useMemo(() => {
    return Object.entries(totals)
      .filter(([name, amount]) => {
        const paid = normalizedEntries
          .filter((entry) => entry.payer === name)
          .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
        const owe = amount - paid
        return owe > 0
      })
      .map(([name]) => name)
  }, [totals, normalizedEntries])

  const allSettled = useMemo(() => {
    return (
      settlablePlayers.length > 0 &&
      settlablePlayers.every((name) => settledPlayers.includes(name))
    )
  }, [settlablePlayers, settledPlayers])

  const handleToggleAllSettled = () => {
    let nextSettled
    if (allSettled) {
      const settlableSet = new Set(settlablePlayers)
      nextSettled = settledPlayers.filter((p) => !settlableSet.has(p))
    } else {
      nextSettled = Array.from(new Set([...settledPlayers, ...settlablePlayers]))
    }
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
    const nextVal = transferTo === name ? '' : name
    setTransferTo(nextVal)
    if (nextVal) setIncludeQrCode(true)
    try {
      localStorage.setItem(`session.transferTo.${session.id}`, nextVal)
    } catch (e) {
      // ignore
    }

    if (onUpdateSession) {
      onUpdateSession({ ...session, transferTo: nextVal })
    }
  }

  const formattedDate = new Date(session.date).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const generateBillImage = async () => {
    const totalHours = (normalizedEntries || []).reduce((s, e) => s + (Number(e.hours) || 0), 0)
    const showQrCode = Boolean(transferTo && includeQrCode)

    const wrapper = document.createElement('div')
    wrapper.style.position = 'absolute'
    wrapper.style.left = '-9999px'
    wrapper.style.top = '0'
    wrapper.style.width = '860px'
    wrapper.style.background = '#F1F5F9'
    wrapper.style.padding = '20px'
    wrapper.style.fontFamily = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    wrapper.style.boxSizing = 'border-box'

    wrapper.innerHTML = `
      <div style="background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.12); border: 1.5px solid #E2E8F0;">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #15803D 0%, #16A34A 50%, #22C55E 100%); padding: 22px 24px; color: #FFFFFF; position: relative;">
          <div style="height: 4px; background: linear-gradient(90deg, #4ADE80, #FACC15, #38BDF8); position: absolute; top: 0; left: 0; right: 0;"></div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.75rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #DCFCE7; margin-bottom: 4px;">⚡ SMASH CALCULATOR</div>
              <div style="font-size: 1.35rem; font-weight: 800; color: #FFFFFF; letter-spacing: -0.01em;">🏸 PHIẾU TÍNH TIỀN PHIÊN CẦU LÔNG</div>
              <div style="font-size: 0.85rem; color: #F0FDF4; font-weight: 600; margin-top: 4px;">📅 ${formattedDate}</div>
            </div>
            <div style="background: rgba(255,255,255,0.2); padding: 9px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.3); text-align: right;">
              <div style="font-size: 0.7rem; color: #DCFCE7; font-weight: 700;">TỔNG KINH PHÍ</div>
              <div style="font-size: 1.25rem; font-weight: 800; color: #FFFFFF;">${formatMoney(Math.round(grandTotal * 1000))}</div>
            </div>
          </div>
        </div>

        <!-- Content Container -->
        <div style="padding: 20px;">
          <!-- 3 Quick Stat Cards -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
            <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 12px; padding: 10px 14px;">
              <div style="font-size: 0.72rem; font-weight: 700; color: #15803D;">👥 Số người tham gia</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${participants.length} tay vợt</div>
            </div>
            <div style="background: #FEF3C7; border: 1.5px solid #FDE68A; border-radius: 12px; padding: 10px 14px;">
              <div style="font-size: 0.72rem; font-weight: 700; color: #B45309;">⏱️ Thời gian chơi</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${totalHours ? `${totalHours} giờ` : 'Cố định'}</div>
            </div>
            <div style="background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: 12px; padding: 10px 14px;">
              <div style="font-size: 0.72rem; font-weight: 700; color: #1D4ED8;">🏦 Chuyển khoản cho</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #0F172A; margin-top: 2px; white-space: nowrap;">${transferTo || 'Chưa chọn'}</div>
            </div>
          </div>

          <!-- Section I: Chi tiết khoản chi -->
          <div style="margin-bottom: 20px;">
            <div style="font-size: 0.9rem; font-weight: 800; color: #0F172A; margin-bottom: 8px;">
              📋 CHI TIẾT CÁC KHOẢN CHI PHÍ
            </div>
            <table style="width: 100%; border-collapse: collapse; border-radius: 10px; overflow: hidden; border: 1px solid #E2E8F0; font-size: 0.82rem; table-layout: fixed;">
              <colgroup>
                <col style="width: 32%;" />
                <col style="width: 18%;" />
                <col style="width: 16%;" />
                <col style="width: 14%;" />
                <col style="width: 20%;" />
              </colgroup>
              <thead>
                <tr style="background: #F8FAFC; color: #475569; border-bottom: 1.5px solid #E2E8F0; text-align: left;">
                  <th style="padding: 9px 12px; white-space: nowrap;">Khoản chi</th>
                  <th style="padding: 9px 12px; white-space: nowrap;">Người ứng trả</th>
                  <th style="padding: 9px 12px; text-align: right; white-space: nowrap;">Số tiền</th>
                  <th style="padding: 9px 12px; text-align: center; white-space: nowrap;">Số người</th>
                  <th style="padding: 9px 12px; text-align: right; white-space: nowrap;">Chia lẻ /người</th>
                </tr>
              </thead>
              <tbody>
                ${normalizedEntries.map((e, idx) => {
      const perPerson = (Array.isArray(e.amounts) && e.amounts.length === e.people.length)
        ? e.amounts.reduce((sum, v) => sum + Number(v || 0), 0)
        : e.amount / (e.people.length || 1)
      return `
                    <tr style="border-bottom: 1px solid #F1F5F9; background: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
                      <td style="padding: 9px 12px; font-weight: 700; color: #0F172A; word-break: break-word; white-space: normal; line-height: 1.35;">${getEntryLabel(e, expenseTypes)}</td>
                      <td style="padding: 9px 12px; color: #334155; word-break: break-word; white-space: normal; line-height: 1.35;">${e.payer}</td>
                      <td style="padding: 9px 12px; text-align: right; font-weight: 700; color: #0F172A; white-space: nowrap;">${formatMoney(Math.round(e.amount * 1000))}</td>
                      <td style="padding: 9px 12px; text-align: center; color: #64748B; white-space: nowrap;">${e.people.length} người</td>
                      <td style="padding: 9px 12px; text-align: right; font-weight: 700; color: #16A34A; white-space: nowrap;">${formatMoney(Math.round(perPerson * 1000))}</td>
                    </tr>
                  `
    }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Section II: Kết quả chia tiền -->
          <div style="margin-bottom: 20px;">
            <div style="font-size: 0.9rem; font-weight: 800; color: #0F172A; margin-bottom: 8px;">
              💵 KẾT QUẢ CHIA TIỀN CẦN CHUYỂN KHOẢN
            </div>
            <table style="width: 100%; border-collapse: collapse; border-radius: 10px; overflow: hidden; border: 1px solid #E2E8F0; font-size: 0.82rem; table-layout: fixed;">
              <colgroup>
                <col style="width: 28%;" />
                <col style="width: 16%;" />
                <col style="width: 16%;" />
                <col style="width: 24%;" />
                <col style="width: 16%;" />
              </colgroup>
              <thead>
                <tr style="background: #F8FAFC; color: #475569; border-bottom: 1.5px solid #E2E8F0; text-align: left;">
                  <th style="padding: 9px 12px; white-space: nowrap;">Vận động viên</th>
                  <th style="padding: 9px 12px; text-align: right; white-space: nowrap;">Phải trả</th>
                  <th style="padding: 9px 12px; text-align: right; white-space: nowrap;">Đã trả trước</th>
                  <th style="padding: 9px 12px; text-align: right; line-height: 1.25;">
                    <div style="font-size: 0.7rem; color: #64748B; font-weight: 700;">CẦN CHUYỂN CHO</div>
                    <div style="color: #15803D; font-weight: 800; word-break: break-word; white-space: normal;">${transferTo || 'Trưởng nhóm'}</div>
                  </th>
                  <th style="padding: 9px 12px; text-align: center; white-space: nowrap;">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([name, amount]) => {
      const paid = normalizedEntries.filter((entry) => entry.payer === name).reduce((sum, entry) => sum + entry.amount, 0)
      const owe = amount - paid
      const isTransferTarget = name === transferTo
      const isSettled = settledPlayers.includes(name)
      const oweAmountToTarget = isTransferTarget ? 0 : Math.max(0, owe)

      return `
                    <tr style="border-bottom: 1px solid #F1F5F9; background: ${isTransferTarget ? '#F0FDF4' : '#FFFFFF'};">
                      <td style="padding: 9px 12px; font-weight: 700; color: ${isTransferTarget ? '#15803D' : '#0F172A'};">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%; min-width: 0;">
                          <span style="word-break: break-word; white-space: normal; line-height: 1.3;">${name}</span>
                          ${isTransferTarget ? '<span style="font-size: 0.64rem; background: #DCFCE7; color: #15803D; padding: 1px 6px; border-radius: 999px; font-weight: 800; flex-shrink: 0; white-space: nowrap;">Người nhận</span>' : ''}
                        </div>
                      </td>
                      <td style="padding: 9px 12px; text-align: right; font-weight: 700; color: #0F172A; white-space: nowrap;">${formatMoney(Math.round(amount * 1000))}</td>
                      <td style="padding: 9px 12px; text-align: right; color: #64748B; white-space: nowrap;">${paid > 0 ? formatMoney(Math.round(paid * 1000)) : '-'}</td>
                      <td style="padding: 9px 12px; text-align: right; font-weight: 800; color: ${oweAmountToTarget > 0 ? '#EA580C' : '#16A34A'}; white-space: nowrap;">
                        ${isTransferTarget ? '0 VND (Nhận tiền)' : (oweAmountToTarget > 0 ? formatMoney(Math.round(oweAmountToTarget * 1000)) : '0 VND')}
                      </td>
                      <td style="padding: 9px 12px; text-align: center; white-space: nowrap;">
                        ${isSettled || isTransferTarget
          ? '<span style="font-size: 0.72rem; font-weight: 800; color: #15803D; background: #DCFCE7; padding: 3px 8px; border-radius: 999px; white-space: nowrap; display: inline-block;">✓ Đã xong</span>'
          : '<span style="font-size: 0.72rem; font-weight: 800; color: #C2410C; background: #FFEDD5; padding: 3px 8px; border-radius: 999px; white-space: nowrap; display: inline-block;">⏳ Chờ CK</span>'}
                      </td>
                    </tr>
                  `
    }).join('')}
              </tbody>
            </table>
          </div>

          ${showQrCode ? `
            <!-- Bottom Payment QR & Transfer Info -->
            <div style="background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%); border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
              <div style="flex: 1;">
                <div style="font-size: 0.9rem; font-weight: 800; color: #0F172A; margin-bottom: 4px;">📲 THANH TOÁN CHUYỂN KHOẢN NHANH</div>
                <div style="font-size: 0.8rem; color: #475569; line-height: 1.4;">
                  Vui lòng chuyển khoản chi phí phiên cầu cho <strong>${transferTo}</strong>.<br/>
                  Cú pháp CK: <code style="background: #E2E8F0; padding: 2px 7px; border-radius: 6px; color: #0F172A; font-weight: 800; word-break: break-word;">${transferTo} Cau Long ${session.date || ''}</code>
                </div>
              </div>
              <div style="background: #FFFFFF; padding: 6px; border-radius: 12px; border: 1px solid #CBD5E1; box-shadow: 0 4px 12px rgba(0,0,0,0.06); text-align: center;">
                <img id="export-bill-qr" src="${paymentQrImage}" alt="QR Thanh toán" style="width: 115px; height: 115px; object-fit: contain; display: block; border-radius: 8px;" />
                <div style="font-size: 0.68rem; font-weight: 800; color: #16A34A; margin-top: 3px;">Quét QR CK</div>
              </div>
            </div>
          ` : ''}

          <!-- Footer Watermark -->
          <div style="text-align: center; margin-top: 16px; padding-top: 10px; border-top: 1px solid #E2E8F0; font-size: 0.75rem; color: #94A3B8; font-weight: 600;">
            ⚡ Smash Calculator - Ứng Dụng Quản Lý Chi Phí & Bảng Xếp Hạng Cầu Lông
          </div>
        </div>
      </div>
    `

    document.body.appendChild(wrapper)

    // Ensure QR image is loaded before canvas render
    const qrImg = wrapper.querySelector('#export-bill-qr')
    if (qrImg && !qrImg.complete) {
      await new Promise((resolve) => {
        qrImg.onload = resolve
        qrImg.onerror = resolve
      })
    }

    try {
      const canvas = await html2canvas(wrapper, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      })
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        }, 'image/png')
      })
    } finally {
      try {
        document.body.removeChild(wrapper)
      } catch (e) {
        /* ignore */
      }
    }
  }

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
      const amounts = Array.isArray(entry.amounts) ? entry.amounts : []
      for (let index = 0; index < entry.people.length; index += 1) {
        const personName = entry.people[index]
        const amountForPerson = amounts.length === entry.people.length ? Number(amounts[index]) : entry.amount / (entry.people.length || 1)
        const name = personName || ''
        if (!Number.isFinite(amountForPerson) || amountForPerson < 0) continue
        if (!breakdown[entry.type][name]) breakdown[entry.type][name] = 0
        breakdown[entry.type][name] += amountForPerson
      }
    }
    return breakdown
  }, [normalizedEntries, players])

  const badmintonTotals = useMemo(() => {
    const totals = {}
    for (const entry of normalizedEntries) {
      if (!BADMINTON_EXPENSE_TYPES.has(entry.type)) continue
      const amounts = Array.isArray(entry.amounts) ? entry.amounts : []
      for (let index = 0; index < entry.people.length; index += 1) {
        const personName = entry.people[index]
        const amountForPerson = amounts.length === entry.people.length ? Number(amounts[index]) : entry.amount / (entry.people.length || 1)
        const name = personName || ''
        if (!Number.isFinite(amountForPerson) || amountForPerson < 0) continue
        totals[name] = (totals[name] || 0) + amountForPerson
      }
    }
    return totals
  }, [normalizedEntries])

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
          <ArrowLeft size={16} /> Quay lại
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
            <Pencil size={16} /> Chỉnh sửa phiên
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={18} style={{ color: '#16A34A' }} /> {formattedDate}
        </div>
      </div>

      <div className="tab-bar">
        <button
          type="button"
          className={`tab-btn ${activeResultTab === 'entries' ? 'active' : ''}`}
          onClick={() => setActiveResultTab('entries')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Receipt size={16} /> Chi tiết khoản chi
        </button>
        <button
          type="button"
          className={`tab-btn ${activeResultTab === 'split' ? 'active' : ''}`}
          onClick={() => setActiveResultTab('split')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Calculator size={16} /> Kết quả chia tiền
        </button>
      </div>

      {activeResultTab === 'entries' && (
        <div className="card">
          <div className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={18} style={{ color: '#16A34A' }} /> Chi tiết khoản chi
          </div>

          <div className="table-wrap">
            <table className="result-table" style={{ marginBottom: 0, tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '34%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Khoản</th>
                  <th style={{ textAlign: 'center' }}>Người trả</th>
                  <th style={{ textAlign: 'right', paddingRight: '12px' }}>Số tiền</th>
                  <th style={{ textAlign: 'center' }}>Người chơi</th>
                  <th style={{ textAlign: 'right', paddingRight: '8px' }}>/người</th>
                </tr>
              </thead>
              <tbody>
                {groupedEntries.map((group, groupIndex) => {
                  return (
                    <Fragment key={group.type}>
                      {group.items.map((entry, itemIndex) => {
                        const perPerson = (Array.isArray(entry.amounts) && entry.amounts.length === entry.people.length)
                          ? entry.amounts.reduce((sum, value) => sum + Number(value || 0), 0)
                          : entry.amount / entry.people.length
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
                            <td style={{ textAlign: 'right', paddingRight: '12px', whiteSpace: 'nowrap', fontWeight: 600 }}>
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
                            <td style={{ textAlign: 'right', paddingRight: '8px', whiteSpace: 'nowrap', color: 'var(--success)', fontWeight: 600, fontSize: '0.8rem' }}>
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
          <div className="card-title" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Calculator size={18} style={{ color: '#16A34A' }} /> Kết quả chia tiền
            </span>
            <div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={async () => {
                  try {
                    setExportingImage(true)
                    const blob = await generateBillImage()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    const dateStr = (session.date || new Date().toISOString().split('T')[0])
                    a.download = `badminton-result-${dateStr}.png`
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch (e) {
                    console.error('Export image error', e)
                  } finally {
                    setExportingImage(false)
                  }
                }}
                disabled={exportingImage}
              >
                <Download size={16} /> Export Bill
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={async () => {
                  try {
                    setCopyingText(true)
                    const billText = `${formatBillDate(session.date)}`
                    await navigator.clipboard.writeText(billText)
                  } catch (e) {
                    console.error('Copy text error', e)
                  } finally {
                    setCopyingText(false)
                  }
                }}
                disabled={copyingText}
                style={{ marginLeft: '8px' }}
              >
                <Copy size={16} /> Copy Time
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={async () => {
                  try {
                    setCopyingImage(true)
                    const blob = await generateBillImage()
                    const item = new ClipboardItem({ 'image/png': blob })
                    await navigator.clipboard.write([item])
                  } catch (e) {
                    console.error('Copy image error', e)
                  } finally {
                    setCopyingImage(false)
                  }
                }}
                disabled={copyingImage}
                style={{ marginLeft: '8px' }}
              >
                <ImageIcon size={16} /> Copy Bill Image
              </button>
            </div>
          </div>

          <div
            style={{
              marginBottom: '16px',
              background: 'var(--bg)',
              padding: '12px 14px',
              borderRadius: '14px',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                  🏦 Người nhận chuyển khoản
                </span>
                {transferTo && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: 'var(--color-court-green)',
                      background: 'var(--color-court-green-soft)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {transferTo}
                  </span>
                )}
                {!canChangeTransferTo && (
                  <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', fontWeight: 600 }}>
                    (Đã thanh toán)
                  </span>
                )}
              </div>

              {/* Custom Toggle Switch for QR Code */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !Boolean(transferTo && includeQrCode)
                  if (nextState) {
                    setIncludeQrCode(true)
                    if (!transferTo) setTransferTo(defaultTransferTo || participants[0] || '')
                  } else {
                    setIncludeQrCode(false)
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: (transferTo && includeQrCode) ? '1.5px solid var(--color-court-green)' : '1.5px solid var(--border)',
                  background: 'var(--card-bg)',
                  color: (transferTo && includeQrCode) ? 'var(--color-court-green)' : 'var(--text-secondary)',
                  boxShadow: (transferTo && includeQrCode) ? '0 2px 8px rgba(34, 197, 94, 0.2)' : 'none',
                  transition: 'all 0.2s ease',
                  userSelect: 'none',
                }}
              >
                <QrCode size={15} color={(transferTo && includeQrCode) ? 'var(--color-court-green)' : 'var(--text-secondary)'} />
                <span>Kèm mã QR Bill</span>

                {/* Switch Indicator */}
                <span
                  style={{
                    width: '32px',
                    height: '18px',
                    borderRadius: '999px',
                    background: (transferTo && includeQrCode) ? 'var(--color-court-green)' : 'var(--border)',
                    position: 'relative',
                    display: 'inline-block',
                    transition: 'background 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      position: 'absolute',
                      top: '2px',
                      left: (transferTo && includeQrCode) ? '16px' : '2px',
                      transition: 'left 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    }}
                  />
                </span>
              </button>
            </div>

            <div className="people-picker">
              {allInvolvedPlayers.map((name) => {
                const isSelected = transferTo === name
                return (
                  <button
                    key={name}
                    type="button"
                    className={`people-chip ${isSelected ? 'selected' : ''}`}
                    disabled={!canChangeTransferTo}
                    onClick={() => handleSetTransferTo(name)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                    {name}
                  </button>
                )
              })}
            </div>
          </div>

          <table className="result-table result-table-split">
            <thead>
              <tr>
                <th>Người chơi</th>
                <th>Phải trả</th>
                <th>Tổng tiền cầu lông</th>
                {allExpenseTypes.map((type) => (
                  <th key={type.value} style={{ fontSize: '0.9rem' }}>
                    {type.emoji} {type.label}
                  </th>
                ))}
                {transferTo && <th style={{ color: 'var(--color-accent)' }}>Chuyển cho {transferTo}</th>}
                <th style={{ textAlign: 'left', paddingLeft: '8px', width: '130px', minWidth: '130px' }}>
                  {settlablePlayers.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '130px' }}>
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
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, userSelect: 'none' }}>
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
                      <td style={{ fontWeight: 600, color: 'var(--color-blue)' }}>
                        {name}{' '}
                        {paid > 0 ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            (đã trả {formatMoney(Math.round(paid * 1000))})
                          </span>
                        ) : null}
                      </td>
                      <td style={{ color: 'var(--color-accent-dark)', fontWeight: 600 }}>{formatMoney(Math.round(amount * 1000))}</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-accent-dark)' }}>
                        {badmintonTotals[name] ? formatMoney(Math.round(badmintonTotals[name] * 1000)) : '-'}
                      </td>
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
                                +{formatMoney(Math.round(transferTotal * 1000))}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)' }}>—</span>
                            )
                          ) : owe > 0 ? (
                            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                              - {formatMoney(Math.round(owe * 1000))}
                            </span>
                          ) : owe < 0 ? (
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                              +{formatMoney(Math.round(Math.abs(owe) * 1000))}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--success)' }}>✓ Đã hòa</span>
                          )}
                        </td>
                      )}
                      <td style={{ textAlign: 'left', paddingLeft: '8px', width: '130px', minWidth: '130px' }}>
                        {canSettle ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%', minWidth: '96px' }}>
                            <label className="settle-toggle" aria-label={`Đánh dấu ${name} đã thanh toán`} style={{ gap: '6px' }}>
                              <input
                                type="checkbox"
                                className="settle-toggle-input"
                                checked={isSettled}
                                onChange={() => handleToggleSettled(name)}
                              />
                              <span className="settle-toggle-box" aria-hidden="true">
                                ✓
                              </span>
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  color: isSettled ? 'var(--success)' : 'var(--danger)',
                                  minWidth: '60px',
                                  textAlign: 'left',
                                  display: 'inline-block',
                                  userSelect: 'none',
                                }}
                              >
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
                <td>Tổng cộng</td>
                <td>{formatMoney(Math.round(grandTotal * 1000))}</td>
                <td style={{ fontWeight: 600 }}>
                  {formatMoney(Math.round(Object.values(badmintonTotals).reduce((sum, value) => sum + value, 0) * 1000))}
                </td>
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
