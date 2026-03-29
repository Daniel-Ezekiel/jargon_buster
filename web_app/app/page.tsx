"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { resultTypes } from "./worker";

interface WorkerMessage {
  status:
    | "initiate"
    | "loading"
    | "ready"
    | "segment_complete"
    | "complete"
    | "error";
  result?: resultTypes;
  results?: resultTypes[];
  data?: never;
  progress?: string;
}

// interface ClassificationResult {
//   status: string;
//   results: resultTypes[];
// }

export default function Home() {
  /* TODO: Add state variables */ // Keep track of the classification result and the model loading status.
  // const [legalText, setLegalText] = useState<string>("");
  const [results, setResults] = useState<resultTypes[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const handleFileUpload = () => {
    const docFile = (document.querySelector("#doc") as HTMLInputElement)
      .files?.[0];
    if (!docFile) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (worker.current) {
        worker.current.postMessage({ text: reader.result as string });
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
          if(ready) setReady(false);
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
              ...(prev as resultTypes[] | []),
              e.data.result!,
            ]);
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

  // const classify = useCallback((text: string) => {
  //   if (worker.current) {
  //     worker.current.postMessage({ text });
  //   }
  // }, []);

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
        <div className="place-self-center flex gap-4 items-center">
          <input
            type="file"
            id="doc"
            className="p-2 bg-slate-800 border border-slate-600 rounded-md cursor-pointer text-sm file:bg-slate-700 file:border-slate-600 file:text-slate-300 hover:file:bg-slate-600 disabled:file:bg-slate-500 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            disabled={isProcessing}
            className="px-6 py-2 rounded-md bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 font-semibold cursor-pointer disabled:cursor-not-allowed"
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
              <div 
                key={res.segmentId} 
                className={`p-4 rounded border-l-4 shadow-lg ${
                  res.routeToCloud ? "bg-slate-800 border-yellow-500" : "bg-slate-800 border-emerald-500"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-slate-400 font-mono">ID: {res.segmentId} | Tokens: {res.segmentSize}</span>
                  <span className={`text-xs px-2 py-1 rounded font-bold ${res.routeToCloud ? "bg-yellow-900 text-yellow-300" : "bg-emerald-900 text-emerald-300"}`}>
                    {res.routeToCloud ? "CLOUD BOUND" : "EDGE SECURED"}
                  </span>
                </div>
                
                <h3 className="font-bold text-lg mb-1">{res.topLabel}</h3>
                <p className="text-sm mb-3">Confidence: <span className="font-mono">{(res.topLabelScore * 100).toFixed(1)}%</span></p>
                
                {res.routeToCloud && res.redactedText && (
                  <div className="mt-3 p-3 bg-slate-900 rounded text-xs text-slate-300 font-mono overflow-y-auto max-h-32">
                    <span className="text-yellow-400 block mb-1">▶ Redacted Payload:</span>
                    {res.redactedText}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* <div>
            <textarea
              className="w-full max-w-xl p-2 border border-gray-300 rounded mb-4"
              placeholder="Enter text here"
              rows={23}
              value={legalText}
              onChange={(e) => setLegalText(e.currentTarget.value)}
            ></textarea>
            {legalText && (
              <button
                type="button"
                className="cursor-pointer px-4 py-2 border-2 border-gray-400 rounded-sm bg-slate-800 hover:bg-slate-700"
                onClick={() => {
                  setReady(false);
                  if (legalText) classify(legalText);
                }}
              >
                Classify Text
              </button>
            )}
          </div> */}
      </section>
    </main>
  );
}
