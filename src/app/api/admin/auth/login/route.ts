import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signAdminToken, ADMIN_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return Response.json({ error: "E-Mail und Passwort erforderlich." }, { status: 400 });
    }

    const user = await prisma.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !user.isActive) {
      return Response.json({ error: "Ungültige Anmeldedaten." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: "Ungültige Anmeldedaten." }, { status: 401 });
    }

    const token = await signAdminToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 Stunden
      path: "/",
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Login error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return Response.json(
      { 
        error: "Serverfehler. Bitte versuchen Sie es später erneut.",
        ...(process.env.NODE_ENV === "development" && { debug: String(error) })
      },
      { status: 500 }
    );
  }
}
