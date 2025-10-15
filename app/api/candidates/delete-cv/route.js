import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  // Initialize Supabase client inside the function to avoid build-time issues
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 }
      );
    }

    // Fetch candidate to get existing cv_url
    const { data: candidate, error: fetchError } = await supabaseAdmin
      .from("candidates")
      .select("id, cv_url")
      .eq("id", id)
      .single();

    if (fetchError || !candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    if (candidate.cv_url) {
      try {
        let fileName = candidate.cv_url;
        if (typeof fileName === "string" && fileName.includes("/")) {
          fileName = fileName.split("/").pop();
        }

        const { error: storageError } = await supabaseAdmin.storage
          .from("cv")
          .remove([fileName]);

        if (storageError) {
          // Not fatal for DB update, but inform caller
          console.error("Error deleting CV from storage:", storageError);
        }
      } catch (storageErr) {
        console.error(
          "Unexpected storage error while deleting CV:",
          storageErr
        );
      }
    }

    // Update candidate record to nullify cv_url
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("candidates")
      .update({ cv_url: null })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update candidate: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, candidate: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing candidate CV:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
