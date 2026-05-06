/**
 * Process recording chunks (5-minute intervals) with AI to extract actions and key points
 * Sends chunks to Silo AI agent for real-time analysis
 */

export class ChunkProcessor {
  constructor(onInsightsGenerated) {
    this.onInsightsGenerated = onInsightsGenerated;
    this.currentChunk = [];
    this.chunkStartTime = 0;
    this.processedChunks = 0;
    this.CHUNK_DURATION_SECONDS = 300; // 5 minutes
  }

  /**
   * Add transcript segment to current chunk
   * Returns true if chunk is ready for processing
   */
  addSegment(segment, currentDuration) {
    this.currentChunk.push(segment);
    
    // Initialize chunk start time on first segment
    if (this.chunkStartTime === 0) {
      this.chunkStartTime = currentDuration;
    }

    // Check if chunk duration threshold reached
    const chunkDuration = currentDuration - this.chunkStartTime;
    if (chunkDuration >= this.CHUNK_DURATION_SECONDS) {
      return true; // Ready to process
    }
    return false;
  }

  /**
   * Process current chunk with AI
   * Returns the chunk text and starts async LLM analysis
   */
  async processChunk(base44) {
    if (this.currentChunk.length === 0) return null;

    const chunkText = this.currentChunk.map(s => s.text).join(' ');
    this.processedChunks++;

    // Fire off async AI analysis without blocking
    this.analyzeChunkAsync(chunkText, base44);

    // Reset chunk for next batch
    const processed = {
      chunkNumber: this.processedChunks,
      text: chunkText,
      segmentCount: this.currentChunk.length
    };

    this.currentChunk = [];
    this.chunkStartTime = 0;

    return processed;
  }

  /**
   * Async AI analysis of chunk - sends to Silo for processing
   * Note: Requires backend functions. If unavailable, skips AI analysis
   */
  async analyzeChunkAsync(chunkText, base44) {
    try {
      // Check if backend functions are available
      if (!base44.integrations?.Core?.InvokeLLM) {
        console.log('Backend functions not available for chunk analysis');
        return;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Silo, an AI meeting assistant. Analyze this 5-minute segment of a meeting transcript and extract:
1. Action items (tasks someone needs to do)
2. Key decisions made
3. Important points discussed
4. Identified speakers/roles

Keep responses concise. Focus on actionable items only.

Transcript:
${chunkText}`,
        response_json_schema: {
          type: "object",
          properties: {
            actions: {
              type: "array",
              items: { type: "string" },
              description: "Specific action items to be done"
            },
            decisions: {
              type: "array",
              items: { type: "string" },
              description: "Key decisions made"
            },
            keyPoints: {
              type: "array",
              items: { type: "string" },
              description: "Important discussion points"
            },
            speakers: {
              type: "array",
              items: { type: "string" },
              description: "Identified speakers/roles mentioned"
            }
          }
        }
      });

      // Send insights to Silo agent for display
      if (this.onInsightsGenerated) {
        this.onInsightsGenerated({
          chunkNumber: this.processedChunks,
          timestamp: new Date().toLocaleTimeString(),
          ...result
        });
      }
    } catch (e) {
      console.warn('Chunk analysis failed:', e);
    }
  }

  /**
   * Get current chunk text without processing
   */
  getCurrentChunkText() {
    return this.currentChunk.map(s => s.text).join(' ');
  }

  /**
   * Check if we have accumulated a substantial chunk
   */
  hasSubstantialChunk() {
    return this.currentChunk.length > 0;
  }
}