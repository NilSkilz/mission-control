// House screen: the hand-picked, per-person slice of Home Assistant.
// This is deliberately a small allow-list, NOT a full HA mirror — power users
// deep-link to HA for everything else.
//
// `allow` is 'all' | 'parents' | an array of usernames.
// Seeded from what actually exists in the house right now (living + snug light
// switches). Add a kid's bedroom light here once it's in HA, e.g.:
//   { entity_id: 'light.logan_bedroom', label: 'bedroom light', room: 'Logan',
//     domain: 'light', icon: '💡', allow: ['logan'] }

export const HOUSE_CONTROLS = [
  { entity_id: 'light.living_light_switch_leds', label: 'living room', room: 'Downstairs', domain: 'light', icon: '🛋️', allow: 'all' },
  { entity_id: 'light.snug_light_switch_leds', label: 'snug', room: 'Downstairs', domain: 'light', icon: '📺', allow: 'all' },
]

// Optional: an HA temperature sensor entity id to show as the house temperature.
// None configured yet (no climate/temperature entity in HA) — leave null to hide.
export const HOUSE_TEMP_SENSOR = null

// Deep link out to the full Home Assistant for everything not wrapped here.
export const HA_LINK = 'https://ha.cracky.co.uk'

export function controlsFor(user) {
  if (!user) return []
  return HOUSE_CONTROLS.filter((c) => {
    if (c.allow === 'all') return true
    if (c.allow === 'parents') return user.role === 'parent'
    if (Array.isArray(c.allow)) return c.allow.includes(user.username) || user.role === 'parent'
    return false
  })
}
