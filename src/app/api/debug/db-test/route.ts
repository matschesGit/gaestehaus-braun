import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    console.log("Testing database connection...");
    
    // Test 1: Simple count query
    const userCount = await prisma.adminUser.count();
    console.log("Admin users count:", userCount);
    
    // Test 2: Try to find the admin user
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: "admin@gaestehaus-braun.de" },
      select: { id: true, email: true, isActive: true, displayName: true }
    });
    console.log("Admin user found:", adminUser);

    return Response.json({ 
      success: true,
      userCount,
      adminUserExists: !!adminUser,
      user: adminUser
    });
  } catch (error) {
    console.error("Database test error:", error);
    return Response.json({ 
      success: false,
      error: String(error),
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
