export interface TelemetryLog {
  segmentId: number;
  contractFilename: string;
  confidenceScore: number;
  runMode: "EDGE_ONLY" | "CLOUD_ONLY" | "HYBRID";
  routingDecision:
    | "EDGE_SECURED"
    | "CLOUD_BOUND"
    | "EDGE_ONLY_FORCED"
    | "CLOUD_ONLY_FORCED"
    | "SKIPPED_NONE";
  redactionApplied: boolean;
  classificationResult: string;
  source: string;
}

class TelemetryTracker {
  private logs: TelemetryLog[] = [];

  // OPTIONAL: Call this when a new file starts processing to wipe its slate clean
  clearLogsForContract(filename: string) {
    const initialLength = this.logs.length;
    this.logs = this.logs.filter((log) => log.contractFilename !== filename);
    if (initialLength !== this.logs.length) {
      console.log(
        `[Telemetry] Cleared ${initialLength - this.logs.length} previous logs for ${filename}`,
      );
    }
  }

  logSegment(data: TelemetryLog) {
    const newLog = { ...data};

    // The Upsert Logic: Check if this specific segment of this specific contract exists
    const existingIndex = this.logs.findIndex(
      (log) => 
        log.contractFilename === data.contractFilename && 
        log.segmentId === data.segmentId &&
        log.runMode === data.runMode // <-- ADD THIS CHECK
    );

    if (existingIndex !== -1) {
      // Overwrite the existing log (e.g., you re-ran the contract)
      this.logs[existingIndex] = newLog;
      console.log(
        `[Telemetry] Overwrote Segment ${data.segmentId} for ${data.contractFilename}`,
      );
    } else {
      // Append as a brand new log
      this.logs.push(newLog);
      console.log(
        `[Telemetry] Logged Segment ${data.segmentId} - ${data.routingDecision}`,
      );
    }
  }

  exportToJSON(filename: string = "sra_telemetry_results.json") {
    if (this.logs.length === 0) {
      alert("No data to export yet! Run a contract first.");
      return;
    }

    const dataStr = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const telemetry = new TelemetryTracker();
