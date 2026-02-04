import { cookies } from 'next/headers'
import { getUserByUsername } from '../../../../scripts/db.js'

export async function POST(request) {
  const { username } = await request.json()
  const user = getUserByUsername(username)
  
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }
  
  cookies().set('user_id', String(user.id), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: '/'
  })
  
  return Response.json({ user })
}
