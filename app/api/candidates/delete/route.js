import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function DELETE(request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    // First, get the candidate to check if they have a CV
    const { data: candidate, error: fetchError } = await supabase
      .from('candidates')
      .select('cv_url')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Delete CV file from storage if it exists
    if (candidate.cv_url) {
      try {
        const { error: storageError } = await supabase.storage
          .from('cv')
          .remove([candidate.cv_url]);

        if (storageError) {
          console.error('Error deleting CV from storage:', storageError);
          // Continue with candidate deletion even if CV deletion fails
        }
      } catch (storageError) {
        console.error('Error deleting CV from storage:', storageError);
        // Continue with candidate deletion even if CV deletion fails
      }
    }

    // Delete the candidate from the database
    const { error: deleteError } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete candidate: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Candidate deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting candidate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 