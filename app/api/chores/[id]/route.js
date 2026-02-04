import { updateChore, deleteChore } from '../../../../lib/data.js'

export async function PATCH(request, { params }) {
  const { id } = await params
  const body = await request.json()
  const updates = {}
  
  if (body.done !== undefined) {
    updates.done = body.done ? true : false
    if (body.done) updates.completedAt = new Date().toISOString()
  }
  if (body.approved !== undefined) {
    updates.approved = body.approved ? true : false
  }
  
  await updateChore(id, updates)
  return Response.json({ ok: true })
}

export async function DELETE(request, { params }) {
  const { id } = await params
  await deleteChore(id)
  return Response.json({ ok: true })
}
