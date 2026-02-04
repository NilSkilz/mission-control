import { getMeals, setMeal } from '../../../scripts/db.js'

export async function GET() {
  return Response.json(getMeals())
}

export async function POST(request) {
  const { date, type, meal, mealId } = await request.json()
  setMeal(date, type, meal, mealId)
  return Response.json({ success: true })
}
