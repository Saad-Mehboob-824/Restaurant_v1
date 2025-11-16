import { verify } from 'jsonwebtoken'

export async function POST(request) {
  try {
    // Get token from cookies
    const tokenCookie = request.cookies.get('token')
    
    if (!tokenCookie) {
      return Response.json({ valid: false, error: 'No token provided' }, { status: 401 })
    }

    const token = tokenCookie.value
    const decoded = verify(token, process.env.JWT_SECRET)
    return Response.json({ valid: true, user: decoded })
  } catch (error) {
    return Response.json({ valid: false, error: error.message }, { status: 401 })
  }
}