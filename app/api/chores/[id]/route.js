import { updateChore, deleteChore } from '../../../../scripts/db.js'

export async function PATCH(request, { params }) {
  const body = await request.json()
  const updates = {}
  
  if (body.done !== undefined) {
    updates.done = body.done ? 1 : 0
    if (body.done) updates.completed_at = new Date().toISOString()
  }
  if (body.approved !== undefined) {
    updates.approved = body.approved ? 1 : 0
  }
  
  updateChore(params.id, updates)
  return Response.json({ ok: true })
}

export async function DELETE(request, { params }) {
  deleteChore(params.id)
  return Response.json({ ok: true })
}
