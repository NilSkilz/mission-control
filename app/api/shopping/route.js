import { getShoppingItems, addShoppingItem, clearCheckedItems } from '../../../scripts/db.js'
import { cookies } from 'next/headers'

export async function GET() {
  return Response.json(getShoppingItems())
}

export async function POST(request) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  const { name, quantity, estimated_cost } = await request.json()
  
  if (!name) {
    return Response.json({ error: 'Name required' }, { status: 400 })
  }
  
  const id = addShoppingItem({ 
    name, 
    quantity, 
    estimated_cost: estimated_cost || null,
    added_by: userId ? parseInt(userId) : null 
  })
  return Response.json({ id })
}

export async function DELETE() {
  clearCheckedItems()
  return Response.json({ success: true })
}
