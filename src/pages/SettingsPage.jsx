import { useState, useMemo } from 'react'
import { Settings, CreditCard, Sparkles, Save, Check, RefreshCw, Users, Shuffle, Palette, Sun, Moon, Monitor } from 'lucide-react'
import PlayerAvatar from '../components/PlayerAvatar'
import { CARTOON_AVATAR_STYLES, getRandomCartoonAvatarUrl } from '../utils/avatarUtils'

export default function SettingsPage({
  players = [],
  settings = { defaultPayer: '' },
  theme = 'system',
  onSelectTheme,
  onSaveSettings,
  onUpdatePlayerAvatar,
  onBulkUpdateAvatars,
}) {
  const sortedPlayers = useMemo(
    () => players.slice().sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })),
    [players]
  )

  const [defaultPayer, setDefaultPayer] = useState(settings.defaultPayer || '')
  const [avatarStyle, setAvatarStyle] = useState('random')
  const [isSaving, setIsSaving] = useState(false)
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Sync settings if props update
  useMemo(() => {
    if (settings.defaultPayer !== undefined) {
      setDefaultPayer(settings.defaultPayer)
    }
  }, [settings.defaultPayer])

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setSavedSuccess(false)
    try {
      if (onSaveSettings) {
        await onSaveSettings({ defaultPayer })
      }
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleBulkRandomize = async (onlyMissing = false) => {
    setIsBulkProcessing(true)
    try {
      if (onBulkUpdateAvatars) {
        await onBulkUpdateAvatars(avatarStyle, onlyMissing)
      }
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const handleSingleRandomize = async (player) => {
    const newAvatar = getRandomCartoonAvatarUrl(player.name || player.id, avatarStyle)
    if (onUpdatePlayerAvatar) {
      await onUpdatePlayerAvatar(player.id, newAvatar)
    }
  }

  const selectedPayerObj = sortedPlayers.find((p) => p.id === defaultPayer || p.name === defaultPayer)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={28} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'white' }}>Cài Đặt Hệ Thống</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.88rem', opacity: 0.9 }}>
              Tùy chỉnh giao diện Sáng / Tối, người trả mặc định & Quản lý Avatar cho tay vợt
            </p>
          </div>
        </div>
      </div>

      {/* Section 0: Theme Settings */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Palette size={22} style={{ color: '#8B5CF6' }} />
          <span>Giao Diện Ứng Dụng (Light / Dark Theme)</span>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '16px' }}>
          Tùy chọn chế độ màu sắc hiển thị phù hợp với sở thích của bạn hoặc tự động đồng bộ theo hệ thống thiết bị.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div
            className={`theme-option-card ${theme === 'light' ? 'active' : ''}`}
            onClick={() => onSelectTheme && onSelectTheme('light')}
          >
            <div style={{ background: '#FEF3C7', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', color: '#D97706' }}>
              <Sun size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Giao diện Sáng (Light)</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Tươi sáng, rực rỡ</div>
            </div>
          </div>

          <div
            className={`theme-option-card ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => onSelectTheme && onSelectTheme('dark')}
          >
            <div style={{ background: '#1E1B4B', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', color: '#818CF8' }}>
              <Moon size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Giao diện Tối (Dark)</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Nền tối, dịu mắt</div>
            </div>
          </div>

          <div
            className={`theme-option-card ${theme === 'system' ? 'active' : ''}`}
            onClick={() => onSelectTheme && onSelectTheme('system')}
          >
            <div style={{ background: '#E0F2FE', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', color: '#0284C7' }}>
              <Monitor size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Tự động (System)</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Theo cài đặt thiết bị</div>
            </div>
          </div>
        </div>
      </div>


      {/* Section 1: Default Payer Settings */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CreditCard size={22} style={{ color: '#10B981' }} />
          <span>Người Trả Tiền Mặc Định</span>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '16px' }}>
          Người chơi này sẽ tự động được chọn làm người trả mặc định cho các khoản phí khi bạn mở khung tạo phiên mới.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', background: 'var(--color-bg-app)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          {selectedPayerObj && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--card-bg)', padding: '6px 14px', borderRadius: '999px', border: '1.5px solid var(--primary)' }}>
              <PlayerAvatar player={selectedPayerObj} size={28} />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                {selectedPayerObj.name}
              </span>
            </div>
          )}

          <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
            <select
              value={defaultPayer}
              onChange={(e) => setDefaultPayer(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid var(--border)',
                fontSize: '0.9rem',
                fontWeight: 600,
                background: 'var(--card-bg)',
                color: 'var(--text)',
              }}
            >
              <option value="">-- Chọn người trả mặc định --</option>
              {sortedPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  👤 {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveSettings}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 700 }}
          >
            {savedSuccess ? <Check size={18} /> : <Save size={18} />}
            {isSaving ? 'Đang lưu...' : savedSuccess ? 'Đã lưu!' : 'Lưu cài đặt'}
          </button>
        </div>
      </div>

      {/* Section 2: Random Cartoon / Animal Avatars Generator */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={22} style={{ color: '#F59E0B' }} />
          <span>Gán Avatar Hoạt Hình & Động Vật Ngẫu Nhiên</span>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '16px' }}>
          Tự động tạo hình ảnh đại diện dễ thương (Mèo hoạt hình, Quái vật, Robot, Động vật, Emoji...) cho tay vợt bằng 1 cú click.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--color-bg-app)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
              🎨 Chọn phong cách Avatar:
            </label>
            <select
              value={avatarStyle}
              onChange={(e) => setAvatarStyle(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: 'var(--card-bg)',
                color: 'var(--text)',
              }}
            >
              <option value="random">🎲 Trộn ngẫu nhiên tất cả phong cách</option>
              {CARTOON_AVATAR_STYLES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleBulkRandomize(false)}
              disabled={isBulkProcessing || players.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 700 }}
            >
              <Shuffle size={18} />
              {isBulkProcessing ? 'Đang tạo...' : '🎲 Random Avatar cho TẤT CẢ vận động viên'}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleBulkRandomize(true)}
              disabled={isBulkProcessing || players.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 700, background: 'var(--card-bg)' }}
            >
              <Sparkles size={18} />
              ✨ Chỉ gán cho ai CHƯA CÓ Avatar
            </button>
          </div>
        </div>

        {/* Individual Player Avatars Grid */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)' }}>
            👥 Danh sách tay vợt & Đổi Avatar cá nhân ({sortedPlayers.length})
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {sortedPlayers.map((player) => (
            <div
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <PlayerAvatar player={player} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {player.avatarSource ? '🖼️ Đã có avatar' : '⚪ Chưa có avatar'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => handleSingleRandomize(player)}
                title="Đổi avatar hoạt hình ngẫu nhiên"
                style={{ padding: '4px 8px', fontSize: '0.75rem', flexShrink: 0 }}
              >
                🎲 Đổi
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
