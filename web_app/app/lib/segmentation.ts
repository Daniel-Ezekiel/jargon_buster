import { AutoTokenizer } from "@huggingface/transformers"

export interface Segment {
  id: number;
  text: string;
  tokenCount: number;
  startToken: number;
  endToken: number;
}


export const segmentation = async (text: string) => {
    const tokenizer = await AutoTokenizer.from_pretrained("Xenova/distilbert-base-uncased-mnli");

    const tokenIds = tokenizer.encode(text, {add_special_tokens: false});

    const segments: Segment[] = []

    const chunkSize: number = 500;
    const overlap: number = 50;
    let segId = 0;

    // A loop through the token IDs, creating chunks of 500 tokens with an overlap of 50 tokens.
    for(let i = 0; i < tokenIds.length; i += chunkSize - overlap){
        const chunk = tokenIds.slice(i, i+chunkSize);

        const decodedChunk = tokenizer.decode(chunk, { skip_special_tokens: true});
        
        if (decodedChunk.trim().length > 0) {
            segments.push({
                id: segId++,
                text: decodedChunk.trim(),
                tokenCount: chunk.length,
                startToken: i,
                endToken: i+chunkSize,
            });
        }
    }

    // console.log(segments, " finalised segments creation.");
    return segments;
}