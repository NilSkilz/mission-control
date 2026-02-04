import { cookies } from 'next/headers'
import { getUserByUsername } from '../../../../lib/data.js'

// Hardcoded passwords per user
const PASSWORDS = {
  rob: 'family123',
  aimee: 'family123',
  dexter: 'dexter1',
  logan: 'logan1',
}

export async function POST(request) {
  const { username, password } = await request.json()
  
  // Check password
  const expectedPassword = PASSWORDS[username?.toLowerCase()]
  if (!expectedPassword || password !== expectedPassword) {
    return Response.json({ error: 'Invalid username or password' }, { status: 401 })
  }
  
  const user = await getUserByUsername(username.toLowerCase())
  
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }
  
  const cookieStore = await cookies()
  cookieStore.set('user_id', user.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: '/'
  })
  
  return Response.json({ user })
}
