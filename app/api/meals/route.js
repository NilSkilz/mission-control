import { getMeals, setMeal } from '../../../lib/data.js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const meals = await getMeals()
  return Response.json(meals)
}

export async function POST(request) {
  const { date, type, meal, mealId } = await request.json()
  await setMeal(date, type, meal, mealId)
  return Response.json({ success: true })
}
