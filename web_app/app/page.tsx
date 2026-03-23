"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface WorkerMessage {
  status: "initiate" | "ready" | "complete";
  result?: {
    topLabel: string;
    topLabelScore: number;
    isConfident: boolean;
    isValidClauseForSRA: boolean;
    routeToCloud: boolean;
    allLabels: string[];
    allScores: number[];
  };
}

export default function Home() {
  /* TODO: Add state variables */ // Keep track of the classification result and the model loading status.
  const [legalText, setLegalText] = useState<string>("");
  const [result, setResult] = useState<null | unknown>(null);
  const [ready, setReady] = useState<null | boolean>(null);

  const handleFileUpload = () => {
    const docFile = (
      (document.querySelector("#doc") as HTMLInputElement).files as FileList
    )[0];

    const reader = new FileReader();

    reader.addEventListener("load", () => {
      // this will then display a text file
      setLegalText(reader.result as string);
    });

    if (docFile) {
      reader.readAsText(docFile);
    }
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
      console.log(e.data)
      switch (e.data.status) {
        case "initiate":
          setReady(false);
          break;
        case "ready":
          setReady(true);
          break;
        case "complete":
          setReady(true);
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
      <section>
        <h1 className="max-w-lg text-3xl font-bold mb-2 text-center">
          Sovereignty Routing Algorithm (SRA) using Transformers.js
        </h1>
        <h2 className="max-w-lg text-xl mb-4 text-center">
          Privacy-Preserving Hybrid Inference Architecture
        </h2>
      </section>

      <section className="mt-4 grid gap-5">
        <div className="flex gap-4 justify-center items-center">
          <input
            type="file"
            name="legal_doc"
            id="doc"
            className="p-3 cursor-pointer bg-slate-700 border border-gray-400 rounded-md"
          />
          <button
            type="button"
            className="cursor-pointer px-4 py-2 border-2 border-gray-400 rounded-sm bg-slate-800 hover:bg-slate-700"
            onClick={handleFileUpload}
          >
            Upload
          </button>
        </div>

        <div className="mt-4 grid gap-10 xl:grid-cols-2">
          <div>
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
          </div>

          <div >
            {ready !== null && (
              <pre className="max-w-180 bg-gray-800 p-2 rounded">
                {!ready || !result
                  ? "Loading..."
                  : JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
