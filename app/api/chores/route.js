import { getChores, addChore, resetRecurringChores } from '../../../lib/dynamodb.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Reset recurring chores on each fetch
  await resetRecurringChores()
  const chores = await getChores()
  return Response.json(chores)
}

export async function POST(request) {
  const body = await request.json()
  const id = await addChore({
    title: body.title,
    assigned_to: body.assigned_to,
    paid: body.paid ? true : false,
    amount: body.amount || 0,
    recurring: body.recurring || null
  })
  return Response.json({ id })
}
