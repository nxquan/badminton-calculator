import { useState, useEffect } from 'react'

export default function PlayerAvatar({ player, size = 32 }) {
  const name = String(player?.name || '').trim()
  const avatar = String(player?.avatarSource || player?.avatar || '').trim()
  const initials = name ? name.charAt(0).toUpperCase() : '?'
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    // reset error state when avatar changes
    setImgError(false)
  }, [avatar])

  const showImage = avatar && !imgError

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '999px',
        overflow: 'hidden',
        flex: '0 0 auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: showImage ? '#E2E8F0' : 'linear-gradient(135deg, #2563eb, #06b6d4)',
        color: 'white',
        fontSize: Math.max(12, Math.floor(size * 0.42)),
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {showImage ? (
        <img
          src={avatar}
          alt={name || 'Avatar'}
          onError={() => setImgError(true)}
          onLoad={() => setImgError(false)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        initials
      )}
    </span>
  )
}