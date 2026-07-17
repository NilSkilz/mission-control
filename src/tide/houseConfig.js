// House screen: the hand-picked, per-person slice of Home Assistant.
// This is deliberately a small allow-list, NOT a full HA mirror — power users
// deep-link to HA for everything else.
//
// `allow` is 'all' | 'parents' | an array of usernames.
// Seeded from what actually exists in the house right now (living + snug light
// switches). Each physical switch exposes three HA entities: `*_leds` (the
// indicator LEDs on the plate), `*_swtich_state` (the wall rocker position) and
// `switch.*_button` — the relay that actually turns the light on/off. That last
// one is what we control. Add a kid's bedroom light here once it's in HA, e.g.:
//   { entity_id: 'light.logan_bedroom', label: 'bedroom light', room: 'Logan',
//     domain: 'light', icon: '💡', allow: ['logan'] }

export const HOUSE_CONTROLS = [
  { entity_id: 'switch.living_light_switch_button', label: 'living room', room: 'Downstairs', domain: 'switch', icon: '🛋️', allow: 'all' },
  { entity_id: 'switch.snug_light_switch_button', label: 'snug', room: 'Downstairs', domain: 'switch', icon: '📺', allow: 'all' },
]

// Optional: an HA temperature sensor entity id to show as the house temperature.
// None configured yet (no climate/temperature entity in HA) — leave null to hide.
export const HOUSE_TEMP_SENSOR = null

// Deep link out to the full Home Assistant for everything not wrapped here.
export const HA_LINK = 'https://ha.cracky.co.uk'

// Alexa devices for the announce widget. These are the Echo/Dot media_players
// in HA; "everywhere" is Alexa's built-in group that speaks on all of them at
// once. TTS is sent via media_player.play_media with content type "announce"
// (the ding-dong chime then the message), so anyone can broadcast "tea time".
export const ALEXA_DEVICES = [
  { entity_id: 'media_player.everywhere', label: 'everywhere', icon: '📢', all: true },
  { entity_id: 'media_player.kitchen_dot', label: 'kitchen', icon: '🍳' },
  { entity_id: 'media_player.living_room_echo', label: 'living room', icon: '🛋️' },
  { entity_id: 'media_player.bedroom_dot', label: 'bedroom', icon: '🛏️' },
  { entity_id: 'media_player.bedroom_clock', label: 'bedroom clock', icon: '⏰' },
  { entity_id: 'media_player.dexter_s_dot', label: "dexter's room", icon: '🎧' },
  { entity_id: 'media_player.logan_s_dot', label: "logan's room", icon: '🎮' },
]

// One-tap message presets for the announce widget.
export const ANNOUNCE_PRESETS = ['Tea time!', "Dinner's ready", 'Come downstairs', 'Time to leave', 'Bedtime']

export function controlsFor(user) {
  if (!user) return []
  return HOUSE_CONTROLS.filter((c) => {
    if (c.allow === 'all') return true
    if (c.allow === 'parents') return user.role === 'parent'
    if (Array.isArray(c.allow)) return c.allow.includes(user.username) || user.role === 'parent'
    return false
  })
}
