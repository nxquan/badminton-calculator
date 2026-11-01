export const DEFAULT_ROOMMATES = {
  payer1: 'Quân AP',
  payer2: 'Trí Trần',
}

export const COMMON_EXPENSE_PRESETS = [
  { name: 'Tiền phòng', icon: '🏠', defaultSplit: 'both' },
  { name: 'Tiền điện', icon: '⚡', defaultSplit: 'both' },
  { name: 'Tiền nước sinh hoạt', icon: '💧', defaultSplit: 'both' },
  { name: 'Tiền Wifi / Internet', icon: '📶', defaultSplit: 'both' },
  { name: 'Nước uống 20L', icon: '🚰', defaultSplit: 'both' },
  { name: 'Đồ dùng / Tạp hóa', icon: '🛒', defaultSplit: 'both' },
  { name: 'Tiền rác & vệ sinh', icon: '🗑️', defaultSplit: 'both' },
  { name: 'Gia vị & nấu ăn', icon: '🧂', defaultSplit: 'both' },
]

export function formatVND(amount) {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + 'đ'
}

export function getCurrentMonthStr() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function formatMonthDisplay(monthStr) {
  if (!monthStr) return ''
  const parts = String(monthStr).split('-')
  if (parts.length === 2) {
    return `Tháng ${parseInt(parts[1], 10)}/${parts[0]}`
  }
  return monthStr
}

export function calculateRoomExpenseSummary(session) {
  const p1 = session?.payer1 || DEFAULT_ROOMMATES.payer1
  const p2 = session?.payer2 || DEFAULT_ROOMMATES.payer2

  const quanExpenses = session?.quanExpenses || []
  const triExpenses = session?.triExpenses || []

  const totalQuanPaid = quanExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const totalTriPaid = triExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const totalExpense = totalQuanPaid + totalTriPaid

  let quanShare = 0
  let triShare = 0

  // Chi phí Quân đã trả
  for (const item of quanExpenses) {
    const amt = Number(item.amount) || 0
    if (amt <= 0) continue
    if (item.split === 'tri_only') {
      // Quân trả hộ Trí hoàn toàn => Trí chịu 100%
      triShare += amt
    } else if (item.split === 'quan_only') {
      // Khoản riêng của Quân => Quân chịu 100%
      quanShare += amt
    } else {
      // Chia đôi mặc định
      quanShare += amt / 2
      triShare += amt / 2
    }
  }

  // Chi phí Trí đã trả
  for (const item of triExpenses) {
    const amt = Number(item.amount) || 0
    if (amt <= 0) continue
    if (item.split === 'quan_only') {
      // Trí trả hộ Quân hoàn toàn => Quân chịu 100%
      quanShare += amt
    } else if (item.split === 'tri_only') {
      // Khoản riêng của Trí => Trí chịu 100%
      triShare += amt
    } else {
      // Chia đôi mặc định
      quanShare += amt / 2
      triShare += amt / 2
    }
  }

  const netQuan = totalQuanPaid - quanShare
  const netTri = totalTriPaid - triShare

  let settlement = {
    direction: 'balanced',
    from: '',
    to: '',
    amount: 0,
    text: 'Đã cân bằng (0đ)',
  }

  if (netQuan > 1) {
    settlement = {
      direction: 'tri_pays_quan',
      from: p2,
      to: p1,
      amount: Math.round(netQuan),
      text: `${p2} cần chuyển cho ${p1}: ${formatVND(netQuan)}`,
    }
  } else if (netTri > 1) {
    settlement = {
      direction: 'quan_pays_tri',
      from: p1,
      to: p2,
      amount: Math.round(netTri),
      text: `${p1} cần chuyển cho ${p2}: ${formatVND(netTri)}`,
    }
  }

  return {
    payer1: p1,
    payer2: p2,
    totalQuanPaid,
    totalTriPaid,
    totalExpense,
    quanShare: Math.round(quanShare),
    triShare: Math.round(triShare),
    netQuan: Math.round(netQuan),
    netTri: Math.round(netTri),
    settlement,
  }
}

export function generateRoomExpenseText(session) {
  const summary = calculateRoomExpenseSummary(session)
  const monthDisplay = formatMonthDisplay(session.month)
  const title = session.title || `Chi phí trọ ${monthDisplay}`
  const p1 = summary.payer1
  const p2 = summary.payer2

  const lines = []
  lines.push(`🏠 QUYẾT TOÁN TIỀN TRỌ: ${title.toUpperCase()}`)
  lines.push(`📅 Thời gian: ${monthDisplay}`)
  lines.push('────────────────────────────')

  // Chi phí p1
  lines.push(`👤 ${p1.toUpperCase()} ĐÃ CHI: ${formatVND(summary.totalQuanPaid)}`)
  if ((session.quanExpenses || []).length === 0) {
    lines.push(`  (Chưa có khoản chi nào)`)
  } else {
    for (const item of session.quanExpenses || []) {
      const splitText = item.split === 'tri_only' ? ' (Trả hộ Trí)' : item.split === 'quan_only' ? ' (Khoản riêng)' : ' (Chia đôi)'
      lines.push(`  • ${item.name}: ${formatVND(item.amount)}${splitText}`)
    }
  }

  lines.push('')
  // Chi phí p2
  lines.push(`👤 ${p2.toUpperCase()} ĐÃ CHI: ${formatVND(summary.totalTriPaid)}`)
  if ((session.triExpenses || []).length === 0) {
    lines.push(`  (Chưa có khoản chi nào)`)
  } else {
    for (const item of session.triExpenses || []) {
      const splitText = item.split === 'quan_only' ? ' (Trả hộ Quân)' : item.split === 'tri_only' ? ' (Khoản riêng)' : ' (Chia đôi)'
      lines.push(`  • ${item.name}: ${formatVND(item.amount)}${splitText}`)
    }
  }

  lines.push('────────────────────────────')
  lines.push(`📊 TỔNG CHI PHÍ THÁNG: ${formatVND(summary.totalExpense)}`)
  lines.push(`• ${p1} phải chịu: ${formatVND(summary.quanShare)} (Đã chi ${formatVND(summary.totalQuanPaid)})`)
  lines.push(`• ${p2} phải chịu: ${formatVND(summary.triShare)} (Đã chi ${formatVND(summary.totalTriPaid)})`)
  lines.push('────────────────────────────')

  if (summary.settlement.direction === 'balanced') {
    lines.push(`🎉 KẾT QUẢ: Hai bên đã cân bằng chi phí (0đ)!`)
  } else {
    lines.push(`👉 KẾT QUẢ QUYẾT TOÁN:`)
    lines.push(`   ${summary.settlement.from} chuyển cho ${summary.settlement.to}: ${formatVND(summary.settlement.amount)}`)
  }

  lines.push(`📌 Trạng thái: ${session.isSettled ? '✅ ĐÃ THANH TOÁN' : '⏳ CHỜ CHUYỂN KHOẢN'}`)

  return lines.join('\n')
}

