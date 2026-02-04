import { cookies } from 'next/headers'
import { getUserById } from '../../../../scripts/db.js'

export async function GET() {
  const userId = cookies().get('user_id')?.value
  
  if (!userId) {
    return Response.json({ user: null })
  }
  
  const user = getUserById(parseInt(userId))
  return Response.json({ user: user || null })
}
