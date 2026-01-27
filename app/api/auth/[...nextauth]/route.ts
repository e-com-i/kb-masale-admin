import NextAuth, { NextAuthOptions, User, Account, Profile } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// Get allowed admin emails from environment variable
// Format: comma-separated list e.g., "admin1@gmail.com,admin2@gmail.com"
const getAllowedAdmins = (): string[] => {
  const adminList = process.env.ALLOWED_ADMIN_EMAILS || '';
  return adminList
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);
};

// Validate if email is in the allowed admin list
const isAllowedAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const allowedAdmins = getAllowedAdmins();

  // If no admins configured, deny all access for security
  if (allowedAdmins.length === 0) {
    console.error('SECURITY WARNING: No ALLOWED_ADMIN_EMAILS configured. All access denied.');
    return false;
  }

  return allowedAdmins.includes(email.toLowerCase());
};

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          // Only request necessary scopes
          scope: 'openid email profile',
        },
      },
    }),
  ],

  callbacks: {
    // Sign-in callback - STRICT authorization check
    async signIn({ user, account, profile }) {
      const email = user?.email;

      // Log authentication attempt (without sensitive data in production)
      console.log(`Auth attempt: ${email ? email.substring(0, 3) + '***' : 'unknown'}`);

      // Strict email validation
      if (!email) {
        console.error('Auth denied: No email provided');
        return false;
      }

      // Check if email is in allowed list
      if (!isAllowedAdmin(email)) {
        console.error(`Auth denied: ${email} is not in allowed admin list`);
        return false;
      }

      // Verify it's a Google account
      if (account?.provider !== 'google') {
        console.error('Auth denied: Only Google authentication is allowed');
        return false;
      }

      // Verify email is verified by Google
      if (profile && 'email_verified' in profile && !profile.email_verified) {
        console.error('Auth denied: Email not verified by Google');
        return false;
      }

      console.log(`Auth success: ${email}`);
      return true;
    },

    // JWT callback - Add custom claims
    async jwt({ token, user, account }) {
      if (user) {
        token.isAdmin = isAllowedAdmin(user.email);
        token.email = user.email;
        token.authTime = Date.now();
      }

      // Re-validate admin status on each token refresh (every request)
      if (token.email) {
        token.isAdmin = isAllowedAdmin(token.email as string);
      }

      return token;
    },

    // Session callback - Expose necessary data to client
    async session({ session, token }) {
      if (session.user) {
        // Double-check admin status on every session access
        const isAdmin = isAllowedAdmin(session.user.email);

        if (!isAdmin) {
          // If user is no longer an admin (removed from list), invalidate session
          throw new Error('User is not authorized');
        }

        // Add admin flag to session
        (session.user as any).isAdmin = isAdmin;
        (session.user as any).authTime = token.authTime;
      }

      return session;
    },

    // Redirect callback - Ensure proper redirects
    async redirect({ url, baseUrl }) {
      // Only allow redirects to our own domain
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    // Session expires in 8 hours (working day)
    maxAge: 8 * 60 * 60,
    // Update session every 15 minutes
    updateAge: 15 * 60,
  },

  jwt: {
    // JWT expires in 8 hours
    maxAge: 8 * 60 * 60,
  },

  // Security options
  secret: process.env.NEXTAUTH_SECRET,

  // Enable debug in development only
  debug: process.env.NODE_ENV === 'development',

  // Events for logging
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`Sign-in event: ${user.email} (new: ${isNewUser})`);
    },
    async signOut({ token }) {
      console.log(`Sign-out event: ${(token as any)?.email || 'unknown'}`);
    },
    async session({ session, token }) {
      // Could add session tracking here
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
