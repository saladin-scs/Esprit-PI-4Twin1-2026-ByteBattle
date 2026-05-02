import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req){

  const { userId, embedding } = await req.json();

  await db.query(
    "UPDATE users SET face_embedding=? WHERE id=?",
    [JSON.stringify(embedding), userId]
  );

  return NextResponse.json({ success: true });
}