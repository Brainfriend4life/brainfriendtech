
import { compare } from "bcryptjs";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        // -----------------------------------------
        // CHECK CREDENTIALS
        // -----------------------------------------

        if (
          !credentials?.email ||
          !credentials?.password
        ) {
          throw new Error("Missing credentials");
        }

        // -----------------------------------------
        // NORMALIZE EMAIL
        // -----------------------------------------

        const email = credentials.email
          .trim()
          .toLowerCase();

        // -----------------------------------------
        // FIND USER
        // -----------------------------------------

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user) {
          throw new Error(
            "Invalid email or password"
          );
        }

        // -----------------------------------------
        // CHECK ACCOUNT STATUS
        // -----------------------------------------

        if (user.status !== "ACTIVE") {
          throw new Error(
            "Your account has been suspended."
          );
        }

        // -----------------------------------------
        // CHECK PASSWORD
        // -----------------------------------------

        const validPassword = await compare(
          credentials.password,
          user.password
        );

        if (!validPassword) {
          throw new Error(
            "Invalid email or password"
          );
        }

        // -----------------------------------------
        // RETURN USER
        // -----------------------------------------

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  // -----------------------------------------
  // SESSION
  // -----------------------------------------

  session: {
    strategy: "jwt",

    // Keep the user logged in for 30 days
    // unless they explicitly sign out.
    maxAge: 30 * 24 * 60 * 60,

    // Refresh the session periodically
    // while the user is actively using the site.
    updateAge: 24 * 60 * 60,
  },

  // -----------------------------------------
  // JWT
  // -----------------------------------------

  jwt: {
    // JWT remains valid for 30 days.
    maxAge: 30 * 24 * 60 * 60,
  },

  // -----------------------------------------
  // CALLBACKS
  // -----------------------------------------

  callbacks: {
    async jwt({ token, user }) {
      // Runs when the user first logs in.
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      // Attach user information to the session.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }

      return session;
    },
  },

  // -----------------------------------------
  // LOGIN PAGE
  // -----------------------------------------

  pages: {
    signIn: "/login",
  },

  // -----------------------------------------
  // SECRET
  // -----------------------------------------

  secret: process.env.NEXTAUTH_SECRET,

  // -----------------------------------------
  // COOKIES
  // -----------------------------------------
  //
  // This makes the authentication cookie persistent
  // instead of depending entirely on browser defaults.
  //

  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",

      options: {
        httpOnly: true,

        sameSite: "lax",

        path: "/",

        secure:
          process.env.NODE_ENV === "production",

        // Keep cookie for 30 days.
        maxAge: 30 * 24 * 60 * 60,
      },
    },
  },
};

