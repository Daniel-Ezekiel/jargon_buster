"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface WorkerMessage {
  status: "initiate" | "ready" | "complete";
  result?: {
    topLabel: string,
    topLabelScore: number,
    isConfident: boolean,
    isValidClauseForSRA: boolean,
    routeToCloud: boolean,
    allLabels: string[],
    allScores: number[],
  };
}

export default function Home() {
  /* TODO: Add state variables */ // Keep track of the classification result and the model loading status.
  const [legalText, setLegalText] = useState<string>("");
  const [result, setResult] = useState<null | unknown>(null);
  const [ready, setReady] = useState<null | boolean>(null);

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
          setReady(false);
          break;
        case "ready":
          setReady(true);
          break;
        case "complete":
          setResult(e.data);
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener("message", onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () =>
      worker.current?.removeEventListener("message", onMessageReceived);
  }, []);

  const classify = useCallback((text: string) => {
    if (worker.current) {
      worker.current.postMessage({ text });
    }
  }, []);

  return (
    /* TODO: See below */
    <main className="flex min-h-screen flex-col items-center justify-center p-12">
      <h1 className="max-w-lg text-3xl font-bold mb-2 text-center">
        Sovereignty Routing Algorithm (SRA) using Transformers.js
      </h1>
      <h2 className="max-w-lg text-xl mb-4 text-center">
        Privacy-Preserving Hybrid Inference Architecture
      </h2>

      <textarea
        className="w-full max-w-xl p-2 border border-gray-300 rounded mb-4"
        placeholder="Enter text here"
        value={legalText}
        onChange={(e) => setLegalText(e.currentTarget.value)}
      ></textarea>
      {legalText && (
        <button
          type="button"
          className="cursor-pointer px-4 py-2 border-2 border-gray-400 rounded-sm bg-slate-800 hover:bg-slate-700"
          onClick={(e) => {
            if (legalText) classify(legalText);
            e.preventDefault();
          }}
        >
          Classify Text
        </button>
      )}

      <div className="mt-8">
        {ready !== null && (
        <pre className="max-w-180 bg-gray-800 p-2 rounded">
          {!ready || !result ? "Loading..." : JSON.stringify(result, null, 2)}
        </pre>
      )}
      </div>
    </main>
  );
}
