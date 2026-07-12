import { useEffect, useMemo, useState, Fragment } from 'react'
import html2canvas from 'html2canvas'
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
  const participants = sortPlayerNames(Object.keys(totals))
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

    return ranked[0]?.[0] || participants[0] || ''
  }, [normalizedEntries, participants])
  const [activeResultTab, setActiveResultTab] = useState('entries')
  const [transferTo, setTransferTo] = useState(defaultTransferTo)
  const [settledPlayers, setSettledPlayers] = useState(session.settledPlayers || [])
  const [exportingImage, setExportingImage] = useState(false)
  const [copyingImage, setCopyingImage] = useState(false)
  const [copyingText, setCopyingText] = useState(false)

  useEffect(() => {
    setSettledPlayers(session.settledPlayers || [])
  }, [session])

  const canEditSession = useMemo(
    () => participants.every((name) => !settledPlayers.includes(name)),
    [participants, settledPlayers]
  )

  // Persist `transferTo` per session in localStorage so user's choice isn't reset
  useEffect(() => {
    const key = `session.transferTo.${session.id}`
    // Priority: session.transferTo (from DB) -> localStorage -> default participant
    if (session.transferTo && participants.includes(session.transferTo)) {
      setTransferTo(session.transferTo)
        return
      }

    try {
      const stored = localStorage.getItem(key)
      if (stored && participants.includes(stored)) {
        setTransferTo(stored)
        return
      }
    } catch (e) {
      // ignore
    }

    setTransferTo(defaultTransferTo)
  }, [session.id, participants, defaultTransferTo])

  useEffect(() => {
    if (!participants.length) {
      setTransferTo('')
    } else if (transferTo && !participants.includes(transferTo)) {
      setTransferTo(defaultTransferTo || participants[0])
    }
  }, [participants, transferTo, defaultTransferTo])

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

  const handleSetTransferTo = (name) => {
    if (!canChangeTransferTo) return
    setTransferTo(name)
    try {
      localStorage.setItem(`session.transferTo.${session.id}`, name)
    } catch (e) {
      // ignore
    }

    if (onUpdateSession) {
      onUpdateSession({ ...session, transferTo: name })
    }
  }

  const formattedDate = new Date(session.date).toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const generateBillImage = async () => {
    const splitTable = document.querySelector('.result-table-split')
    if (!splitTable) throw new Error('Split table not found')

    const wrapper = document.createElement('div')
    wrapper.style.background = '#ffffff'
    wrapper.style.padding = '16px'
    wrapper.style.paddingTop = '32px'
    wrapper.style.display = 'inline-block'
    wrapper.style.position = 'absolute'
    wrapper.style.left = '-9999px'
    wrapper.style.top = '0'
    wrapper.style.color = 'black'
    wrapper.style.fontFamily = getComputedStyle(document.body).fontFamily || 'sans-serif'
    wrapper.style.maxWidth = '1200px'

    const createSectionTitle = (text) => {
      const title = document.createElement('div')
      title.style.fontWeight = '700'
      title.style.fontSize = '32px'
      title.style.marginTop = '24px'
      title.style.marginBottom = '8px'
      title.textContent = text
      return title
    }

    const createInfoRow = (text) => {
      const row = document.createElement('div')
      row.style.fontSize = '14px'
      row.style.lineHeight = '1.5'
      row.textContent = text
      return row
    }

    const buildDetailsTable = () => {
      const table = document.createElement('table')
      table.style.width = '100%'
      table.style.borderCollapse = 'collapse'
      table.style.tableLayout = 'fixed'
      table.style.marginTop = '8px'

      const colgroup = document.createElement('colgroup')
      const widths = ['240px', '60px', '80px', 'auto', '80px']
      for (const width of widths) {
        const col = document.createElement('col')
        col.style.width = width
        colgroup.appendChild(col)
      }
      table.appendChild(colgroup)

      const thead = document.createElement('thead')
      const headerRow = document.createElement('tr')
      const headerCells = [
        'Khoản',
        'Người trả',
        'Số tiền',
        'Người chơi',
        '/người',
      ]
      for (const label of headerCells) {
        const th = document.createElement('th')
        th.style.padding = '8px 6px'
        th.style.textAlign = 'left'
        th.style.fontSize = '13px'
        th.style.fontWeight = '700'
        th.style.borderBottom = '1px solid rgba(0,0,0,0.12)'
        th.textContent = label
        headerRow.appendChild(th)
      }
      thead.appendChild(headerRow)
      table.appendChild(thead)

      const tbody = document.createElement('tbody')
      groupedEntries.forEach((group, groupIndex) => {
        group.items.forEach((entry, itemIndex) => {
          const perPerson = (Array.isArray(entry.amounts) && entry.amounts.length === entry.people.length)
            ? entry.amounts.reduce((sum, value) => sum + Number(value || 0), 0)
            : entry.amount / (entry.people.length || 1)
          const isFirstInGroup = itemIndex === 0
          const row = document.createElement('tr')
          row.style.backgroundColor = groupIndex % 2 === 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.5)'
          if (isFirstInGroup) {
            row.style.borderTop = '1px solid rgba(59, 130, 246, 1)'
          }

          const fields = [
            getEntryLabel(entry, expenseTypes),
            entry?.payerObj?.name || entry?.payer || '',
            formatMoney(entry.amount * 1000),
          ]

          fields.forEach((value) => {
            const td = document.createElement('td')
            td.style.padding = '8px 6px'
            td.style.verticalAlign = 'top'
            td.style.whiteSpace = 'nowrap'
            td.style.fontSize = '13px'
            td.style.fontWeight = '500'
            td.textContent = value
            row.appendChild(td)
          })

          const peopleCell = document.createElement('td')
          peopleCell.style.padding = '8px 6px'
          peopleCell.style.fontSize = '12px'
          peopleCell.style.color = 'rgb(73, 101, 243)'
          peopleCell.style.minWidth = '0'
          const peopleGrid = document.createElement('div')
          peopleGrid.style.display = 'grid'
          peopleGrid.style.gridTemplateColumns = `repeat(${Math.max(playerColumns.length, 1)}, minmax(42px, 1fr))`
          peopleGrid.style.gap = '8px'
          peopleGrid.style.width = '100%'

          playerColumns.forEach((name) => {
            const active = (entry.people || []).includes(name)
            const badge = document.createElement('span')
            badge.style.display = 'flex'
            badge.style.alignItems = 'center'
            badge.style.justifyContent = 'center'
            badge.style.padding = '2px 4px'
            badge.style.borderRadius = '3px'
            badge.style.fontWeight = '500'
            badge.style.fontSize = '11px'
            badge.style.whiteSpace = 'nowrap'
            badge.style.backgroundColor = active ? 'rgba(73, 101, 243, 0.2)' : 'transparent'
            badge.textContent = active ? name : ''
            peopleGrid.appendChild(badge)
          })

          peopleCell.appendChild(peopleGrid)
          row.appendChild(peopleCell)

          const perPersonCell = document.createElement('td')
          perPersonCell.style.padding = '8px 6px'
          perPersonCell.style.whiteSpace = 'nowrap'
          perPersonCell.style.color = 'var(--success)'
          perPersonCell.style.fontWeight = '600'
          perPersonCell.style.fontSize = '13px'
          perPersonCell.textContent = formatMoney(Math.round(perPerson * 1000))
          row.appendChild(perPersonCell)

          tbody.appendChild(row)
        })
      })
      table.appendChild(tbody)
      return table
    }

    const buildPaymentBlock = async () => {
      const paymentBlock = document.createElement('div')
      paymentBlock.style.marginTop = '16px'
      paymentBlock.style.display = 'flex'
      paymentBlock.style.flexDirection = 'column'
      paymentBlock.style.alignItems = 'center'
      paymentBlock.style.gap = '8px'
      paymentBlock.style.color = 'black'

      const paymentTitle = document.createElement('div')
      paymentTitle.style.fontWeight = '700'
      paymentTitle.style.fontSize = '15px'
      paymentTitle.textContent = 'Thanh toán qua QR'
      paymentBlock.appendChild(paymentTitle)

      const paymentCaption = document.createElement('div')
      paymentCaption.style.fontSize = '13px'
      paymentCaption.style.opacity = '0.85'
      paymentCaption.style.textAlign = 'center'
      paymentCaption.textContent = 'Quét mã QR bên dưới để chuyển khoản'
      paymentBlock.appendChild(paymentCaption)

      const paymentQrWrapper = document.createElement('div')
      paymentQrWrapper.style.background = '#fff'
      paymentQrWrapper.style.borderRadius = '16px'
      paymentQrWrapper.style.padding = '14px'
      paymentQrWrapper.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)'
      paymentQrWrapper.style.display = 'flex'
      paymentQrWrapper.style.alignItems = 'center'
      paymentQrWrapper.style.justifyContent = 'center'

      const paymentQr = document.createElement('img')
      paymentQr.alt = 'QR thanh toán'
      paymentQr.src = paymentQrImage
      paymentQr.style.width = '240px'
      paymentQr.style.maxWidth = '100%'
      paymentQr.style.display = 'block'

      await new Promise((resolve, reject) => {
        paymentQr.onload = resolve
        paymentQr.onerror = reject
      })

      paymentQrWrapper.appendChild(paymentQr)
      paymentBlock.appendChild(paymentQrWrapper)
      return paymentBlock
    }

    const header = document.createElement('div')
    header.style.color = 'black'
    header.style.marginBottom = '8px'
    header.style.display = 'flex'
    header.style.flexDirection = 'column'
    header.style.gap = '4px'

    const hTitle = document.createElement('div')
    hTitle.style.fontWeight = '700'
    hTitle.style.fontSize = '16px'
    hTitle.textContent = `Phiên: ${formattedDate}`
    header.appendChild(hTitle)

    const infoLine = document.createElement('div')
    infoLine.style.display = 'flex'
    infoLine.style.flexWrap = 'wrap'
    infoLine.style.gap = '16px'
    infoLine.style.alignItems = 'center'

    infoLine.appendChild(createInfoRow(`Số người tham gia: ${participants.length}`))

    const totalHours = (normalizedEntries || []).reduce((s, e) => s + (Number(e.hours) || 0), 0)
    infoLine.appendChild(createInfoRow(`Số giờ chơi: ${totalHours || '-'}`))
    infoLine.appendChild(createInfoRow(`Chi phí: ${formatMoney(Math.round(grandTotal * 1000))}`))
    header.appendChild(infoLine)

    const splitClone = splitTable.cloneNode(true)
    splitClone.style.maxWidth = '100%'
    splitClone.style.marginTop = '8px'

    wrapper.appendChild(createSectionTitle('I. Thông tin chung'))
    wrapper.appendChild(header)
    wrapper.appendChild(createSectionTitle('II. Chi tiết khoản chi'))
    wrapper.appendChild(buildDetailsTable())
    wrapper.appendChild(createSectionTitle('III. Kết quả chia tiền'))
    wrapper.appendChild(splitClone)
    wrapper.appendChild(await buildPaymentBlock())

    document.body.appendChild(wrapper)

    try {
      const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: null })
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        })
      })
    } finally {
      try { document.body.removeChild(wrapper) } catch (e) { /* ignore */ }
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
          ← Quay lại
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
            ✎ Chỉnh sửa phiên
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-title">📅 {formattedDate}</div>
      </div>

      <div className="tab-bar">
        <button
          type="button"
          className={`tab-btn ${activeResultTab === 'entries' ? 'active' : ''}`}
          onClick={() => setActiveResultTab('entries')}
        >
          📋 Chi tiết khoản chi
        </button>
        <button
          type="button"
          className={`tab-btn ${activeResultTab === 'split' ? 'active' : ''}`}
          onClick={() => setActiveResultTab('split')}
        >
          💵 Kết quả chia tiền
        </button>
      </div>

      {activeResultTab === 'entries' && (
        <div className="card">
          <div className="card-title">📋 Chi tiết khoản chi</div>

          <div className="table-wrap">
            <table className="result-table" style={{ marginBottom: 0, tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '240px' }} />
                <col style={{ width: '84px' }} />
                <col style={{ width: '84px' }} />
                <col />
                <col style={{ width: '84px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Khoản</th>
                  <th style={{textAlign: 'center'}}>Người trả</th>
                  <th style={{textAlign: 'right'}}>Số tiền</th>
                  <th style={{textAlign: 'center'}}>Người chơi</th>
                  <th style={{textAlign: 'right'}}>/người</th>
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
                            <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
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
                            <td style={{ whiteSpace: 'nowrap', color: 'var(--success)', fontWeight: 600, fontSize: '0.8rem' }}>
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
          <div className="card-title" style={{marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            💵 Kết quả chia tiền
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
                📤 Export Bill
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
                📋 Copy Time
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
                🖼️ Copy Bill Image
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '4px' }}>
            <label
              style={{
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',

              }}
            >
              Chuyển tiền cho ai?
              {!canChangeTransferTo && (
              <div style={{ marginLeft: '6px', color: 'var(--color-error)', fontWeight: 600 }}>
                Đã có người thanh toán nên không thể đổi người chuyển tiền.
              </div>
            )}
            </label>
            <div className="people-picker">
              {participants.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`people-chip ${transferTo === name ? 'selected' : ''}`}
                  disabled={!canChangeTransferTo}
                  onClick={() => handleSetTransferTo(name)}
                >
                  {name}
                </button>
              ))}
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
                {transferTo && <th style = {{color: 'var(--color-accent)'}}>Chuyển cho {transferTo}</th>}
                <th>Đánh dấu</th>
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
                      <td style={{color: 'var(--color-accent-dark)', fontWeight: 600}}>{formatMoney(Math.round(amount * 1000))}</td>
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
                      <td style={{ textAlign: 'left', paddingLeft: '8px' }}>
                        {canSettle ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-start', width: '100%', minWidth: '96px' }}>
                            <label className="settle-toggle" aria-label={`Đánh dấu ${name} đã thanh toán`}>
                              <input
                                type="checkbox"
                                className="settle-toggle-input"
                                checked={isSettled}
                                onChange={() => handleToggleSettled(name)}
                              />
                              <span className="settle-toggle-box" aria-hidden="true">
                                ✓
                              </span>
                            </label>
                            <span
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: isSettled ? 'var(--success)' : 'var(--danger)',
                                minWidth: '62px',
                                textAlign: 'left',
                                display: 'inline-block',
                              }}
                            >
                              {isSettled ? 'Paid' : 'Pending'}
                            </span>
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
