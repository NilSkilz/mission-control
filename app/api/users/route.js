import { getUsers } from '../../../lib/data.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const users = await getUsers()
  return Response.json(users)
}
