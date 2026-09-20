import React from 'react'
import { Home, Calendar, Trophy, Users, UserCheck, CreditCard, BarChart3, Settings } from 'lucide-react'

export default function Sidebar({ onSelectMenu, currentView = 'sessions', className = '' }) {
  return (
    <aside className={`sidebar ${className}`}>
      <div className="sidebar-section">
        <button
          className={`sidebar-menu-btn ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => onSelectMenu && onSelectMenu('home')}
        >
          <Home size={18} /> Trang chủ
        </button>
      </div>

      <div className="sidebar-section">
        <button
          className={`sidebar-menu-btn ${currentView === 'sessions' || currentView === 'session' ? 'active' : ''}`}
          onClick={() => onSelectMenu && onSelectMenu('sessions')}
        >
          <Calendar size={18} /> Phiên cầu
        </button>
      </div>

      <div className="sidebar-section">
        <button
          className={`sidebar-menu-btn ${currentView === 'match-history' ? 'active' : ''}`}
          onClick={() => onSelectMenu && onSelectMenu('match-history')}
        >
          <Trophy size={18} /> Lịch sử thi đấu
        </button>
      </div>

      <div className="sidebar-section">
        <button
          className={`sidebar-menu-btn ${currentView === 'players' ? 'active' : ''}`}
          onClick={() => onSelectMenu && onSelectMenu('players')}
        >
          <Users size={18} /> Vận động viên
        </button>
        <div className="sidebar-submenu">
          <button
            className={`sidebar-menu-btn ${currentView === 'combo-T3' ? 'active' : ''}`}
            onClick={() => onSelectMenu && onSelectMenu('combo-T3')}
          >
            <UserCheck size={16} /> Nhóm Thứ 3
          </button>
          <button
            className={`sidebar-menu-btn ${currentView === 'combo-T7' ? 'active' : ''}`}
            onClick={() => onSelectMenu && onSelectMenu('combo-T7')}
          >
            <UserCheck size={16} /> Nhóm Thứ 7
          </button>
        </div>
      </div>

      <div className="sidebar-section">
        <button
          className={`sidebar-menu-btn ${currentView === 'types' ? 'active' : ''}`}
          onClick={() => onSelectMenu && onSelectMenu('types')}
        >
          <CreditCard size={18} /> Kinh phí sân
        </button>
      </div>

      <div className="sidebar-section">
        <button
          className={`sidebar-menu-btn ${currentView === 'stats' ? 'active' : ''}`}
          onClick={() => onSelectMenu && onSelectMenu('stats')}
        >
          <BarChart3 size={18} /> Bảng xếp hạng
        </button>
      </div>

      <div className="sidebar-section">
        <button
          className={`sidebar-menu-btn ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => onSelectMenu && onSelectMenu('settings')}
        >
          <Settings size={18} /> Cài đặt
        </button>
      </div>
    </aside>
  )
}


