export const PLAYERS = ['Trí', 'Tỷ', 'Khánh', 'Bin', 'Tèo', 'Khoa', 'Thành', 'Bình', 'Quân', 'Long']

export const COMBOS = [
  { label: 'T3', emoji: '🟢', members: ['Trí', 'Tỷ', 'Khánh', 'Bin', 'Tèo', 'Khoa'] },
  { label: 'T7', emoji: '🔵', members: ['Trí', 'Tỷ', 'Khánh', 'Bin', 'Tèo', 'Quân', 'Long'] },
]

export const DEFAULT_EXPENSE_TYPES = [
  { value: 'san', label: 'Tiền sân', emoji: '🏟️' },
  { value: 'cau', label: 'Tiền cầu', emoji: '🏸' },
  { value: 'tra-da', label: 'Tiền trà đá', emoji: '🧊' },
  { value: 'com', label: 'Tiền cơm', emoji: '🍚' },
]

export const EXPENSE_TYPES = DEFAULT_EXPENSE_TYPES

export function formatMoney(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ'
}

export const DEFAULT_PAYER = 'Trí'

export function sortExpenseTypes(types) {
  return [...new Map(types.map((type) => [type.value, type])).values()].sort((a, b) =>
    String(a.label || a.value).localeCompare(String(b.label || b.value), 'vi', { sensitivity: 'base' })
  )
}

export function normalizeExpenseTypeLabel(label) {
  return String(label || '').trim()
}

export function expenseTypeValueFromLabel(label) {
  return normalizeExpenseTypeLabel(label)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'chi-phi-moi'
}

export function sortPlayerNames(names) {
  return [...new Set(names.map((name) => String(name || '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'vi', { sensitivity: 'base' })
  )
}

export function getSessionPeople(sessions) {
  return sortPlayerNames(
    sessions.flatMap((session) =>
      session.entries.flatMap((entry) => [entry.payer, ...(entry.people || [])])
    )
  )
}

export function getEntryLabel(entry, expenseTypes = DEFAULT_EXPENSE_TYPES) {
  const typeInfo = expenseTypes.find((t) => t.value === entry.type)
  const label = typeInfo ? `${typeInfo.emoji || '🧾'} ${typeInfo.label}` : entry.type
  return entry.note ? `${label} - ${entry.note}` : label
}

export function calculateTotals(entries) {
  const totals = {}

  for (const entry of entries) {
    if (entry.people.length === 0 || entry.amount <= 0) continue
    const perPerson = entry.amount / entry.people.length
    for (const person of entry.people) {
      totals[person] = (totals[person] || 0) + perPerson
    }
  }

  return totals
}
