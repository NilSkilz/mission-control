import { getEarnings } from '../../../lib/data.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const earnings = await getEarnings()
  return Response.json(earnings)
}
