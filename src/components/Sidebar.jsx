import React from 'react'

export default function Sidebar({ onSelectMenu, className = '' }) {
  return (
    <aside className={`sidebar ${className}`}>
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
          onClick={() => onSelectMenu && onSelectMenu('match-history')}
        >
          🏆 Lịch sử thi đấu
        </button>
      </div>

      <div className="sidebar-section">
        <button
          className="sidebar-menu-btn"
          onClick={() => onSelectMenu && onSelectMenu('players')}
        >
          🧑 Người chơi
        </button>
        <div className="sidebar-submenu">
          <button className="sidebar-menu-btn" onClick={() => onSelectMenu && onSelectMenu('combo-T3')}>Thứ 3</button>
          <button className="sidebar-menu-btn" onClick={() => onSelectMenu && onSelectMenu('combo-T7')}>Thứ 7</button>
        </div>
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
