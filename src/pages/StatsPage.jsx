import Stats from '../components/Stats'

export default function StatsPage({ sessions, expenseTypes }) {
  return (
    <Stats sessions={sessions} expenseTypes={expenseTypes} />
  )
}
