import { NextResponse } from "next/server";

const VERSION = process.env.npm_package_version ?? "0.1.0";

export async function GET() {
  return NextResponse.json({ db: "ok", version: VERSION }, { status: 200 });
}
