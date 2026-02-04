import { updateShoppingItem, deleteShoppingItem } from '../../../../scripts/db.js'

export async function PATCH(request, { params }) {
  const { id } = await params
  const updates = await request.json()
  updateShoppingItem(id, updates)
  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  const { id } = await params
  deleteShoppingItem(id)
  return Response.json({ success: true })
}
