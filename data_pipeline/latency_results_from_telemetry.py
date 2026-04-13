import json
import os

# Define the file paths for the three architectures
files = {
    "cloud_only": "telemetry_data/cloud_only_telemetry_results.json",
    "edge_only": "telemetry_data/edge_only_telemetry_results.json",
    "hybrid": "telemetry_data/hybrid_telemetry_results.json"
}

final_output = {}

for mode, filepath in files.items():
    if not os.path.exists(filepath):
        print(f"File {filepath} not found.")
        continue
        
    with open(filepath, 'r') as f:
        data = json.load(f)
        
    # Grouping by contractFilename using a standard dictionary
    grouped_data = {}
    for row in data:
        contract_name = row.get('contractFilename')
        if contract_name not in grouped_data:
            grouped_data[contract_name] = []
        grouped_data[contract_name].append(row)
        
    mode_data = {
        "total_mode_latency_ms": 0.0,
        "average_contract_latency_ms": 0.0,
        "contracts": {}
    }
    
    total_mode_latency = 0.0
    contract_count = 0
    
    # Process each contract
    for contract_name, segments in grouped_data.items():
        # Sort segments strictly by segmentId using Python's built-in sort
        segments.sort(key=lambda x: x.get('segmentId', 0))
        
        segments_list = []
        contract_total_latency = 0.0
        
        for i, row in enumerate(segments):
            seg_id = row.get('segmentId')
            current_latency = row.get('latencyMs', 0.0)
            
            # The exact instruction: except for the segment with an id of 0
            if seg_id == 0 or i == 0:
                seg_latency = current_latency
            else:
                prev_latency = segments[i-1].get('latencyMs', 0.0)
                seg_latency = current_latency - prev_latency
            
            # Prevent negative floating point anomalies
            seg_latency = max(0.0, float(seg_latency))
                
            segments_list.append({
                "segmentId": int(seg_id),
                "segment_latency_ms": seg_latency
            })
            contract_total_latency += seg_latency
            
        num_segments = len(segments_list)
        avg_segment_latency = contract_total_latency / num_segments if num_segments > 0 else 0.0
        
        # Save contract-level data
        mode_data["contracts"][contract_name] = {
            "total_contract_latency_ms": contract_total_latency,
            "average_segment_latency_ms": avg_segment_latency,
            "segments": segments_list
        }
        
        total_mode_latency += contract_total_latency
        contract_count += 1
        
    # Calculate mode-level averages
    mode_data["total_mode_latency_ms"] = total_mode_latency
    mode_data["average_contract_latency_ms"] = total_mode_latency / contract_count if contract_count > 0 else 0.0
    
    final_output[mode] = mode_data

# Export to a single compiled JSON file
with open("results/compiled_latency_results.json", "w") as f:
    json.dump(final_output, f, indent=4)
    
print("compiled_latency_results.json successfully generated!")