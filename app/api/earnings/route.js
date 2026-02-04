import { getEarnings } from '../../../scripts/db.js'

export async function GET() {
  return Response.json(getEarnings())
}
