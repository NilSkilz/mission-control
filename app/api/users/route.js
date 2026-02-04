import { getUsers } from '../../../lib/dynamodb.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const users = await getUsers()
  return Response.json(users)
}
