import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(request) {
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

    // First, get the candidate to check if they have a CV
    const { data: candidate, error: fetchError } = await supabaseAdmin
      .from("candidates")
      .select("cv_url")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    console.log(`Found candidate with cv_url: ${candidate.cv_url}`);

    // Delete CV file from storage if it exists
    if (candidate.cv_url) {
      try {
        // The cv_url should already be just the filename (e.g., "1234567890_cv.pdf")
        // But let's handle both cases: full URL or just filename
        let fileName = candidate.cv_url;

        // If it's a full URL, extract the filename
        if (candidate.cv_url.includes("/")) {
          fileName = candidate.cv_url.split("/").pop();
        }

        console.log(`Attempting to delete CV file: ${fileName}`);

        const { error: storageError } = await supabaseAdmin.storage
          .from("cv")
          .remove([fileName]);

        if (storageError) {
          console.error("Error deleting CV from storage:", storageError);
          // Continue with candidate deletion even if CV deletion fails
        } else {
          console.log(`Successfully deleted CV file: ${fileName}`);
        }
      } catch (storageError) {
        console.error("Error deleting CV from storage:", storageError);
        // Continue with candidate deletion even if CV deletion fails
      }
    }

    // Delete the candidate from the database
    const { error: deleteError } = await supabaseAdmin
      .from("candidates")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete candidate: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Candidate deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting candidate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
