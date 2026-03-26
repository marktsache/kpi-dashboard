import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    photoUrl?: string | null;
  }
  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
      photoUrl?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    photoUrl?: string | null;
  }
}
