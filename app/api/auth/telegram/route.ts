import { NextResponse } from "next/server";
import { authorizeTelegram, createSession, localDemoUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { initData?: unknown };
    const initData = typeof body.initData === "string" ? body.initData : "";
    const user = initData ? authorizeTelegram(initData) : localDemoUser();
    if (!user) return NextResponse.json({ error: "Access not approved" }, { status: 401 });

    const response = NextResponse.json({ user });
    response.cookies.set({
      name: "tgtrading_session",
      value: createSession(user),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Access not approved" }, { status: 401 });
  }
}
