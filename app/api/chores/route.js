import { getChores, addChore, resetRecurringChores } from '../../../scripts/db.js'

export async function GET() {
  // Reset recurring chores on each fetch
  resetRecurringChores()
  return Response.json(getChores())
}

export async function POST(request) {
  const body = await request.json()
  const id = addChore({
    title: body.title,
    assigned_to: body.assigned_to,
    paid: body.paid ? 1 : 0,
    amount: body.amount || 0,
    recurring: body.recurring || null
  })
  return Response.json({ id })
}
