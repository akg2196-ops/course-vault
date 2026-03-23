import { NextResponse } from "next/server";
import { getOrCreateMockUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getOrCreateMockUser();
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Session failed" }, { status: 500 });
  }
}
