// The four person colours from the Tide design. Keyed by username so it works
// whether or not the data store hands back a colour field.
export const PERSON_COLORS = {
  dexter: '#3D6BC6',
  logan: '#3C9D5D',
  aimee: '#C25E7E',
  rob: '#5D6470',
}

// "everyone" / shared events use a neutral pip.
export const EVERYONE_COLOR = '#99A0A8'

export function personColor(person) {
  if (!person) return EVERYONE_COLOR
  const key = (typeof person === 'string' ? person : person.username || person.display_name || '')
    .toLowerCase()
  return PERSON_COLORS[key] || person?.color || EVERYONE_COLOR
}

export function firstName(person) {
  if (!person) return ''
  const name = person.display_name || person.displayName || person.username || ''
  return name.split(' ')[0]
}

export function initial(person) {
  return (firstName(person)[0] || '?').toUpperCase()
}
