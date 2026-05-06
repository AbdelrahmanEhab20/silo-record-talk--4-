import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Helper function to upload transcript text to file storage and return the URL
 * Called during recording finalization and merging
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transcript_text } = await req.json();

    if (!transcript_text || typeof transcript_text !== 'string') {
      return Response.json({ error: 'Invalid transcript_text' }, { status: 400 });
    }

    // Create a text file from the transcript
    const encodedText = new TextEncoder().encode(transcript_text);
    const file = new File([encodedText], 'transcript.txt', { type: 'text/plain' });

    // Upload using the Core integration (service role for reliable file upload)
    const result = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    
    return Response.json({
      file_url: result.file_url,
      transcript_length: transcript_text.length,
    });
  } catch (error) {
    console.error('Error uploading transcript:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});