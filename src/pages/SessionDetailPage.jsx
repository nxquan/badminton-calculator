import SessionResult from '../components/SessionResult'

export default function SessionDetailPage({ session, expenseTypes, onBack, onUpdateSession, onEditSession }) {
  return (
    <SessionResult
      session={session}
      expenseTypes={expenseTypes}
      onBack={onBack}
      onUpdateSession={onUpdateSession}
      onEditSession={onEditSession}
    />
  )
}
