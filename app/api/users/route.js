import { getUsers } from '../../../scripts/db.js'

export async function GET() {
  return Response.json(getUsers())
}
