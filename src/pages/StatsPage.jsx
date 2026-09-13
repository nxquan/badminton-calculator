import Stats from '../components/Stats'

export default function StatsPage({ sessions, expenseTypes, players }) {
  return (
    <Stats sessions={sessions} expenseTypes={expenseTypes} players={players} />
  )
}

