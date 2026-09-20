// Utility functions for generating random cartoon and animal avatars

export const CARTOON_AVATAR_STYLES = [
  {
    id: 'cats',
    label: '🐱 Mèo hoạt hình (RoboHash Cats)',
    getUrl: (seed) => `https://robohash.org/${encodeURIComponent(seed)}?set=set4`,
  },
  {
    id: 'monsters',
    label: '👾 Quái vật vui nhộn (RoboHash Monsters)',
    getUrl: (seed) => `https://robohash.org/${encodeURIComponent(seed)}?set=set2`,
  },
  {
    id: 'robots',
    label: '🤖 Robot hoạt hình (RoboHash Robots)',
    getUrl: (seed) => `https://robohash.org/${encodeURIComponent(seed)}?set=set3`,
  },
  {
    id: 'bottts',
    label: '🤖 Cartoon Bottts (DiceBear)',
    getUrl: (seed) => `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`,
  },
  {
    id: 'adventurer',
    label: '🎨 Cartoon Adventurer (DiceBear)',
    getUrl: (seed) => `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`,
  },
  {
    id: 'thumbs',
    label: '🦊 Động vật dễ thương (DiceBear Thumbs)',
    getUrl: (seed) => `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}`,
  },
  {
    id: 'fun-emoji',
    label: '🥳 Fun Emoji (DiceBear)',
    getUrl: (seed) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}`,
  },
]

export function getRandomCartoonAvatarUrl(seed = '', styleId = 'random') {
  const effectiveSeed = seed
    ? `${seed}-${Math.random().toString(36).substring(2, 7)}`
    : Math.random().toString(36).substring(2, 9)

  if (styleId && styleId !== 'random') {
    const found = CARTOON_AVATAR_STYLES.find((s) => s.id === styleId)
    if (found) return found.getUrl(effectiveSeed)
  }

  const randomIndex = Math.floor(Math.random() * CARTOON_AVATAR_STYLES.length)
  return CARTOON_AVATAR_STYLES[randomIndex].getUrl(effectiveSeed)
}
