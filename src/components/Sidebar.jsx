import React from 'react'

export default function Sidebar({ onSelectMenu }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <button
          className="sidebar-menu-btn"
          onClick={() => onSelectMenu && onSelectMenu('sessions')}
        >
          📁 Phiên cầu
        </button>
      </div>

      <div className="sidebar-section">
        <button
          className="sidebar-menu-btn"
          onClick={() => onSelectMenu && onSelectMenu('players')}
        >
          🧑 Người chơi
        </button>
      </div>

      <div className="sidebar-section">
        <button
          className="sidebar-menu-btn"
          onClick={() => onSelectMenu && onSelectMenu('types')}
        >
          💳 Kinh phí
        </button>
      </div>

      <div className="sidebar-section">
        <button
          className="sidebar-menu-btn"
          onClick={() => onSelectMenu && onSelectMenu('stats')}
        >
          📊 Thống kê
        </button>
      </div>
    </aside>
  )
}
