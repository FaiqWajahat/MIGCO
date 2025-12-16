import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// The function MUST be declared as 'async' because it uses 'await'
export async function proxy(request) {
// ☝️ CHANGE IS HERE: add 'async'

  // 1. Get the token from the cookie
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  // 2. Define protected routes (Add more here if needed)
  const isProtectedRoute = pathname.startsWith("/Dashboard");
  
  // 3. Define public routes (Login page is "/")
  const isPublicRoute = pathname === "/";

  // Case 1: Attempting to access protected route without a token
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Case 2: Verify token if it exists
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      
      // 'await' is now valid here
      await jwtVerify(token, secret); 

      // If token is valid and user is on the Login page, redirect to Dashboard
      if (isPublicRoute) {
        return NextResponse.redirect(new URL("/Dashboard", request.url));
      }

    } catch (error) {
      console.error("Middleware: Invalid token", error);
      // Token is invalid or expired
      if (isProtectedRoute) {
        const response = NextResponse.redirect(new URL("/", request.url));
        // Optional: clear the cookie if it's bad
        response.cookies.delete("auth_token");
        return response;
      }
    }
  }

  // Allow the request to proceed
  return NextResponse.next();
}

// Configuration remains the same
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};