import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Server-side Convex JWT endpoint.
 *  Bypasses the browser navigator.onLine check that causes clerk_offline errors.
 */
export async function GET() {
  try {
    const { getToken } = await auth();
    const token = await getToken({ template: "convex" });
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ token: null });
  }
}
