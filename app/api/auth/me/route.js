import { cookies } from 'next/headers'
import { getUserById } from '../../../../lib/dynamodb.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value
  
  if (!userId) {
    return Response.json({ user: null })
  }
  
  const user = await getUserById(userId)
  return Response.json({ user: user || null })
}
