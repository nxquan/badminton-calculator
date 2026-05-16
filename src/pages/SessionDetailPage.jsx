import SessionResult from '../components/SessionResult'

export default function SessionDetailPage({ session, expenseTypes, players, onBack, onUpdateSession, onEditSession }) {
  return (
    <SessionResult
      session={session}
      expenseTypes={expenseTypes}
      players={players}
      onBack={onBack}
      onUpdateSession={onUpdateSession}
      onEditSession={onEditSession}
    />
  )
}
