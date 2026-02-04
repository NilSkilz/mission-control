import { updateShoppingItem, deleteShoppingItem } from '../../../../lib/dynamodb.js'

export async function PATCH(request, { params }) {
  const { id } = await params
  const updates = await request.json()
  await updateShoppingItem(id, updates)
  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  const { id } = await params
  await deleteShoppingItem(id)
  return Response.json({ success: true })
}
