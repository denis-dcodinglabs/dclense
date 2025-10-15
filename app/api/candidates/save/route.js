import { NextResponse } from "next/server";
// import { createClient } from '@supabase/supabase-js';

// const supabaseAdmin = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );
const supabaseAdmin = null;

export async function POST(request) {
  try {
    const candidateData = await request.json();

    // Helper function to handle date fields
    const handleDateField = (dateValue) => {
      if (!dateValue || dateValue === "") return null;
      return dateValue;
    };

    // Prepare the data for insertion
    const dataToInsert = {
      ...candidateData,
      willing_to_relocate: candidateData.willing_to_relocate === "yes",
      user_date_added:
        candidateData.user_date_added || new Date().toISOString(),
      // Handle empty date strings by converting them to null
      date_available: handleDateField(candidateData.date_available),
    };

    // Remove the cv file object from the data
    delete dataToInsert.cv;

    const { data, error } = { data: [dataToInsert], error: null };

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: `Failed to save candidate: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      candidate: data[0],
    });
  } catch (error) {
    console.error("Save candidate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
