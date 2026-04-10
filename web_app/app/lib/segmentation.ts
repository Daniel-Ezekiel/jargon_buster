import { AutoTokenizer, PreTrainedTokenizer } from "@huggingface/transformers";

const MODEL_ID = "Xenova/distilbert-base-uncased-mnli";
const CHUNK_SIZE = 400;
const OVERLAP = 50;

let tokenizerInstance: PreTrainedTokenizer | null = null;

async function getTokenizer(): Promise<PreTrainedTokenizer> {
  if (!tokenizerInstance) {
    tokenizerInstance = await AutoTokenizer.from_pretrained(MODEL_ID);
  }
  return tokenizerInstance;
}

export interface Segment {
  id: number;
  text: string;
  tokenCount: number;
  startToken: number;
  endToken: number;
}

export const segmentation = async (text: string): Promise<Segment[]> => {
  const tokenizer = await getTokenizer();

  // Extract all words with their character positions
  const wordRegex = /\S+/g;
  const words: { word: string; start: number; end: number }[] = [];
  let match;
  while ((match = wordRegex.exec(text)) !== null) {
    words.push({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  if (words.length === 0) return [];

  // Batch encode all words in a single tokenizer call
  const wordStrings = words.map((w) => w.word);
  const batchEncoded = await tokenizer(wordStrings, {
    add_special_tokens: false,
    padding: true,
    truncation: true,
  });

  // Get token count per word from the batch attention_mask
  // attention_mask shape: [numWords, maxSeqLen] — sum of 1s = real tokens per word
  const attentionMask = batchEncoded.attention_mask;
  const [numWords, maxSeqLen] = attentionMask.dims;

  const wordTokenCounts: number[] = [];
  for (let i = 0; i < numWords; i++) {
    let count = 0;
    for (let j = 0; j < maxSeqLen; j++) {
      const val = Number(attentionMask.data[i * maxSeqLen + j]);
      if (val === 1) count++;
    }
    wordTokenCounts.push(count);
  }

  // Build cumulative token start position per word
  const wordTokenStart: number[] = [];
  let cumulative = 0;
  for (const count of wordTokenCounts) {
    wordTokenStart.push(cumulative);
    cumulative += count;
  }
  const totalTokens = cumulative;

  // Slide over token space and map back to character positions
  const segments: Segment[] = [];
  let segId = 0;

  for (
    let tokenStart = 0;
    tokenStart < totalTokens;
    tokenStart += CHUNK_SIZE - OVERLAP
  ) {
    const tokenEnd = Math.min(tokenStart + CHUNK_SIZE, totalTokens);

    // Find words whose token span falls within [tokenStart, tokenEnd)
    const chunkWords = words.filter((_, i) => {
      const wTokenStart = wordTokenStart[i];
      const wTokenEnd = wTokenStart + wordTokenCounts[i];
      return wTokenStart >= tokenStart && wTokenEnd <= tokenEnd;
    });

    if (chunkWords.length === 0) break;

    // Reconstruct cased text from original string using char offsets
    const charStart = chunkWords[0].start;
    const charEnd = chunkWords[chunkWords.length - 1].end;
    const casedChunk = text.substring(charStart, charEnd).trim();

    if (casedChunk.length > 0) {
      segments.push({
        id: segId++,
        text: casedChunk,
        tokenCount: tokenEnd - tokenStart,
        startToken: tokenStart,
        endToken: tokenEnd,
      });
    }

    if (tokenEnd === totalTokens) break;
  }

  console.log(`Finalized creation of ${segments.length} cased segments.`);
//   console.log(segments);
  return segments;
};