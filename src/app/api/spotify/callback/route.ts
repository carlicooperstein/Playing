import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin?error=${error}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/admin?error=no_code', request.url)
    );
  }

  // Redirect to admin with code
  return NextResponse.redirect(
    new URL(`/admin?code=${code}`, request.url)
  );
}




