import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const fileName = `${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from("agenda-documents")
    .upload(fileName, file);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("agenda-documents").getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl, name: file.name });
}
