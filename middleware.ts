import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware() {
    // User is authenticated
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};