import { cloudErrorResponse, cloudSuccessResponse, edgeAndHybridResultTypes, cloudResultTypes } from "../worker";
const SegmentCard = ({
  res,
  srAction,
}: {
  res: edgeAndHybridResultTypes | cloudResultTypes;
  srAction: "edge" | "cloud" | "hybrid";
}) => {
  return (
    <div
      key={res.segmentId}
      className={`p-4 rounded border-l-4 shadow-lg ${
        res.routeToCloud
          ? "bg-slate-800 border-yellow-500"
          : "bg-slate-800 border-emerald-500"
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-slate-400 font-mono">
          ID: {res.segmentId} | Tokens: {res.segmentSize}
        </span>
        <span
          className={`text-xs px-2 py-1 rounded font-bold ${res.routeToCloud ? "bg-yellow-900 text-yellow-300" : "bg-emerald-900 text-emerald-300"}`}
        >
          {srAction === "edge" && res.routeToCloud && "CLOUD REQUIRED"}
          {srAction !== "edge" && res.routeToCloud && "CLOUD BOUND"}
          {!res.routeToCloud && "EDGE SECURED"}
        </span>
      </div>

      <h3 className="font-bold text-lg mb-1">{res.topLabel}</h3>
      <p className="text-sm mb-3">
        Confidence:{" "}
        <span className="font-mono">
          {(res.topLabelScore)}%
        </span>
      </p>

      {srAction !== "cloud" && res.routeToCloud && !(res.cloudOutcome as cloudErrorResponse)?.error && (
        <div className="mb-3 p-3 bg-yellow-900 rounded text-xs text-yellow-300 font-mono">
          <span className="text-yellow-400 block mb-1">▶ Cloud Outcome:</span>
          <span>{(res.cloudOutcome as cloudSuccessResponse)?.topLabel}</span>
          <span> (Confidence: {((res.cloudOutcome as cloudSuccessResponse)?.confidence)}%)</span>
          <span className="block mt-1 text-yellow-500">Source: {(res.cloudOutcome as cloudSuccessResponse)?.source}</span>
        </div>
      )}

      {res.routeToCloud && (res.cloudOutcome as cloudErrorResponse)?.error && (
        <div className="mb-3 p-3 bg-red-900 rounded text-xs text-red-300 font-mono">
          <span className="text-red-400 block mb-1">▶ Cloud Classification Error:</span>
          <span>{(res.cloudOutcome as cloudErrorResponse)?.error}</span>
        </div>
      )}

      {/* {res.routeToCloud && res.redactedText && (
        <div className="mt-3 p-3 bg-slate-900 rounded text-xs text-slate-300 font-mono overflow-y-auto max-h-32">
          <span className="text-yellow-400 block mb-1">
            ▶ Redacted Payload:
          </span>
          {res.redactedText}
        </div>
      )} */}
    </div>
  );
};

export default SegmentCard;
