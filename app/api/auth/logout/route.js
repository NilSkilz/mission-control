import { cookies } from 'next/headers'

export async function POST() {
  cookies().set('user_id', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/'
  })
  return Response.json({ ok: true })
}
