import { NextResponse } from "next/server";
import db from "@/lib/db";

function euclideanDistance(a,b){
  let sum=0;
  for(let i=0;i<a.length;i++){
    sum+=(a[i]-b[i])**2;
  }
  return Math.sqrt(sum);
}

export async function POST(req){

  const { userId, embedding } = await req.json();

  const [rows] = await db.query(
    "SELECT face_embedding FROM users WHERE id=?",
    [userId]
  );

  const saved = JSON.parse(rows[0].face_embedding);

  const distance = euclideanDistance(saved, embedding);

  return NextResponse.json({
    match: distance < 0.6
  });
}