import React from 'react'
import { Home, Calendar, Trophy, Users, UserCheck, CreditCard, BarChart3, Settings, Sun, Moon, Monitor } from 'lucide-react'

export default function Sidebar({ onSelectMenu, currentView = 'sessions', theme = 'system', onSelectTheme, className = '' }) {
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

      <div className="sidebar-section" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Giao diện
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', background: 'var(--bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button
            type="button"
            title="Giao diện Sáng"
            onClick={() => onSelectTheme && onSelectTheme('light')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              border: 'none',
              borderRadius: '6px',
              background: theme === 'light' ? 'var(--primary)' : 'transparent',
              color: theme === 'light' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Sun size={16} />
          </button>
          <button
            type="button"
            title="Giao diện Tối"
            onClick={() => onSelectTheme && onSelectTheme('dark')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              border: 'none',
              borderRadius: '6px',
              background: theme === 'dark' ? 'var(--primary)' : 'transparent',
              color: theme === 'dark' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Moon size={16} />
          </button>
          <button
            type="button"
            title="Tự động theo hệ thống"
            onClick={() => onSelectTheme && onSelectTheme('system')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              border: 'none',
              borderRadius: '6px',
              background: theme === 'system' ? 'var(--primary)' : 'transparent',
              color: theme === 'system' ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Monitor size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}



