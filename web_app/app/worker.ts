import {
  pipeline,
  env,
  PipelineType,
  ProgressCallback,
  ZeroShotClassificationPipeline,
  AutoTokenizer,
} from "@huggingface/transformers";

// Skip local model check
env.allowLocalModels = false;

const NONE_LABEL = "Governing Law, Document Name, Parties...";

const CLAUSE_LABELS = [
  "Termination for Convenience",
  "Non-compete",
  "Uncapped Liability",
  "Cap on Liability",
  NONE_LABEL
];

// Use the Singleton pattern to enable lazy construction of the pipeline.
class PipelineSingleton {
  static task: PipelineType = "zero-shot-classification";
  static model = "Xenova/distilbert-base-uncased-mnli";
  static tokenizer = AutoTokenizer.from_pretrained(this.model);
  static instance: ZeroShotClassificationPipeline | null = null;

  static async getInstance(progress_callback: ProgressCallback | undefined) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback }) as unknown as ZeroShotClassificationPipeline;
    }
    return this.instance;
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  // Retrieve the classification pipeline. When called for the first time,
  // this will load the pipeline and save it for future use.
  const classifier = await PipelineSingleton.getInstance((x) => {
    // We also add a progress callback to the pipeline so that we can
    // track model loading.
    self.postMessage(x);
  });

  const legal_text: string = event.data.text;

  // Actually perform the classification
  const output = await classifier(legal_text, CLAUSE_LABELS, {
    multi_label: false,
  }) as {labels: string[], scores: number[], sequence: string};

  
  const maxScore = Math.max(...output.scores);
  const topLabelIdx = output.scores.indexOf(maxScore);
  const topLabelScore = output["scores"][topLabelIdx]
  const topLabel = output["labels"][topLabelIdx]
  const isConfident = topLabelScore > 0.5
  const isValidClauseForSRA = topLabel !== NONE_LABEL

  const results = {
    topLabel,
    topLabelScore,
    isConfident,
    isValidClauseForSRA,
    routeToCloud: !isValidClauseForSRA || !isConfident,
    allLabels: output.labels,
    allScores: output.scores,
  }

  // Send the output back to the main thread
  self.postMessage({
    status: "complete",
    results,
  });
});
