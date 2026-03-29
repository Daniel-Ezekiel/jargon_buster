import {
  pipeline,
  PipelineType,
  ProgressCallback,
  TokenClassificationPipeline,
  ZeroShotClassificationPipeline,
} from "@huggingface/transformers";

export class MultiModelSingleton {
  static classifierInstance: ZeroShotClassificationPipeline | null = null;
  static classifierTask: PipelineType = "zero-shot-classification";
  static classifierModel = "Xenova/distilbert-base-uncased-mnli";
  
  static nerInstance: TokenClassificationPipeline | null = null;
  static nerTask: PipelineType = "token-classification";
  static nerModel =  "Xenova/bert-base-NER"
  

  static async getClassifier(progress_callback: ProgressCallback | undefined) {
    if (this.classifierInstance === null) {
      this.classifierInstance = (await pipeline(this.classifierTask, this.classifierModel, {
        dtype: "q8",
        device: "wasm",
        progress_callback,
      })) as unknown as ZeroShotClassificationPipeline;
    }
    return this.classifierInstance;
  }

  static async getNER(progress_callback: ProgressCallback | undefined) {
    if (this.nerInstance === null) {
      this.nerInstance = (await pipeline(this.nerTask, this.nerModel, {
        dtype: "q8",
        device: "wasm",
        progress_callback,
      })) as unknown as TokenClassificationPipeline;
    }
    return this.nerInstance;
  }
}
