"use client";

import { useState, useEffect, useRef } from "react";
import { cloudResultTypes, edgeAndHybridResultTypes } from "./worker";
import SegmentCard from "./_components/segmentCard";
import { telemetry, TelemetryLog } from "./lib/telemetry";

interface WorkerMessage {
  status:
    | "initiate"
    | "loading"
    | "ready"
    | "segment_complete"
    | "complete"
    | "error";
  result?: edgeAndHybridResultTypes | cloudResultTypes;
  results?: (edgeAndHybridResultTypes | cloudResultTypes)[];
  data?: never;
  progress?: string;
  telemetryPayload?: TelemetryLog;
}

// interface ClassificationResult {
//   status: string;
//   results: resultTypes[];
// }

export default function Home() {
  /* TODO: Add state variables */ // Keep track of the classification result and the model loading status.
  const [results, setResults] = useState<(edgeAndHybridResultTypes | cloudResultTypes)[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [srAction, setSrAction] = useState<"edge" | "cloud" | "hybrid">("edge");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const handleSrActionChange = (action: "edge" | "cloud" | "hybrid") => {
    setSrAction(action);
  };

  const handleFileUpload = () => {
    const docFile = (document.querySelector("#doc") as HTMLInputElement)
      .files?.[0];
    if (!docFile) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (worker.current) {
        worker.current.postMessage({
          legal_text: reader.result as string,
          srAction,
          contractFilename: docFile.name,
        });
      }
    });
    reader.readAsText(docFile);
  };

  // Create a reference to the worker object.
  const worker = useRef<null | Worker>(null);

  // We use the `useEffect` hook to set up the worker as soon as the `App` component is mounted.
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e: MessageEvent<WorkerMessage>) => {
      switch (e.data.status) {
        case "initiate":
          if (ready) setReady(false);
          break;
        case "loading":
          // Optional: handle model download progress here
          break;
        case "ready":
          setReady(true);
          setIsProcessing(true);
          setResults([]); // Clear previous results
          break;
        case "segment_complete":
          // Stream the new segment into the UI array immediately
          if (e.data.result) {
            setResults((prev) => [
              ...(prev as (edgeAndHybridResultTypes | cloudResultTypes)[] | []),
              e.data.result!,
            ]);

            if (e.data.telemetryPayload) {
              telemetry.logSegment(e.data.telemetryPayload);
            }
          }

          if (e.data.progress) setProgress(e.data.progress);
          break;
        case "complete":
          setIsProcessing(false);
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener("message", onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () =>
      worker.current?.removeEventListener("message", onMessageReceived);
  }, []);

  return (
    /* TODO: See below */
    <main className="flex min-h-screen flex-col items-center p-12">
      <section>
        <h1 className="max-w-lg text-3xl font-bold mb-2 text-center">
          Sovereignty Routing Algorithm (SRA) using Transformers.js
        </h1>
        <h2 className="max-w-lg text-xl mb-4 text-center">
          Privacy-Preserving Hybrid Inference Architecture
        </h2>
      </section>

      <section className="mt-4 grid gap-5">
        <div className="place-self-center flex items-center space-between gap-5">
          <button
            disabled={isProcessing}
            onClick={() => handleSrActionChange("edge")}
            className={`border-gray-400 font-medium w-32 py-2 px-4 rounded-md cursor-pointer hover:scale-105 transition-transform disabled:cursor-not-allowed ${srAction === "edge" ? "ring-2 ring-emerald-400 bg-emerald-700 hover:bg-emerald-800" : "bg-sky-600 hover:bg-sky-700"}`}
          >
            Edge Only
          </button>
          <button
            disabled={isProcessing}
            onClick={() => handleSrActionChange("cloud")}
            className={`border-gray-400 font-medium w-32 py-2 px-4 rounded-md cursor-pointer hover:scale-105  transition-transform disabled:cursor-not-allowed ${srAction === "cloud" ? "ring-2 ring-emerald-400 bg-emerald-700 hover:bg-emerald-800" : "bg-sky-600 hover:bg-sky-700"}`}
          >
            Cloud Only
          </button>
          <button
            disabled={isProcessing}
            onClick={() => handleSrActionChange("hybrid")}
            className={`border-gray-400 font-medium w-32 py-2 px-4 rounded-md cursor-pointer hover:scale-105  transition-transform disabled:cursor-not-allowed ${srAction === "hybrid" ? "ring-2 ring-emerald-400 bg-emerald-700 hover:bg-emerald-800" : "bg-sky-600 hover:bg-sky-700"}`}
          >
            Hybrid
          </button>
          <button
            disabled={isProcessing}
            onClick={() =>
              telemetry.exportToJSON(`telemetry_results.json`)
            }
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded shadow-lg transition-colors"
          >
            Download Telemetry JSON
          </button>
        </div>

        <div className="place-self-center flex gap-4 items-center">
          <input
            type="file"
            id="doc"
            disabled={isProcessing}
            className="p-2 bg-slate-800 border border-slate-600 rounded-md cursor-pointer text-sm file:bg-slate-700 file:border-slate-600 file:text-slate-300 hover:file:bg-slate-600 disabled:file:bg-slate-500 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled={isProcessing}
            className="px-6 py-2 rounded-md bg-sky-600 hover:scale-105 hover:bg-sky-700 transition-transform disabled:bg-slate-600 font-semibold cursor-pointer disabled:cursor-not-allowed"
            onClick={handleFileUpload}
          >
            {isProcessing ? "Processing..." : "Upload and Classify"}
          </button>
        </div>

        {isProcessing && (
          <p className="text-emerald-400 font-mono">
            Processing Segments: {progress}
          </p>
        )}

        {results.length > 0 && (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {results.map((res) => (
              <SegmentCard key={res.segmentId} res={res} srAction={srAction} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
