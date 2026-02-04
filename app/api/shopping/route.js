import { getShoppingItems, addShoppingItem, clearCheckedItems } from '../../../lib/dynamodb.js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await getShoppingItems()
  return Response.json(items)
}

export async function POST(request) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value
  const { name, quantity, estimated_cost } = await request.json()
  
  if (!name) {
    return Response.json({ error: 'Name required' }, { status: 400 })
  }
  
  const id = await addShoppingItem({ 
    name, 
    quantity, 
    estimated_cost: estimated_cost || null,
    added_by: userId || null 
  })
  return Response.json({ id })
}

export async function DELETE() {
  await clearCheckedItems()
  return Response.json({ success: true })
}
