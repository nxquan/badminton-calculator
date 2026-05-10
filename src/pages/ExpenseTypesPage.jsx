export default function ExpenseTypesPage({ 
  expenseTypes, 
  onAddClick, 
  onEditClick, 
  onDeleteClick 
}) {
  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: 'space-between' }}>
        <span>💳 Kinh phí</span>
        <button className="btn btn-add" onClick={onAddClick}>➕ Thêm loại</button>
      </div>
      <div style={{ padding: 12 }}>
        {expenseTypes.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Chưa có loại kinh phí nào.</p>
        ) : (
          <div className="table-wrap">
            <table className="result-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>Biểu tượng</th>
                  <th>Tên</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenseTypes.map((t) => (
                  <tr key={t.value}>
                    <td style={{ fontSize: '1.3em', width: 120, textAlign: 'center' }}>{t.emoji}</td>
                    <td>{t.label}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => onEditClick(t)}>✎</button>
                      <button className="btn btn-danger-soft btn-sm" style={{ marginLeft: 6 }} onClick={() => {
                        if (confirm(`Xóa loại "${t.label}"?`)) onDeleteClick(t.value)
                      }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
