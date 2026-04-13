import os
import json

TELEMETRY_FILES_PATH = "telemetry_data"
GROUND_TRUTHS_PATH = "cuad_ground_truth/ground_truth.json"

# Define your categories once.
CLAUSE_MAPPINGS = {
    "non-compete": "Non-compete",
    "termination-for-convenience": "Termination for Convenience",
    "uncapped-liability": "Uncapped Liability",
    "cap-on-liability": "Cap on Liability"
    # "None of the Above" is intentionally excluded from F1 calculations
}

def load_json(filepath):
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return []

def find_clause_count(clause_string, results_list):
    """Filters the list and returns the count for a specific clause string."""
    return sum(1 for res in results_list if res.get("classificationResult") == clause_string)

def build_mode_metrics(contract_results, ground_truth):
    """Dynamically builds the clause counts for any specific run mode."""
    metrics = {
        key: find_clause_count(search_str, contract_results) 
        for key, search_str in CLAUSE_MAPPINGS.items()
    }
    metrics["ground-truth"] = ground_truth
    return metrics

def safe_div(num, den):
    return num / den if den > 0 else 0.0

def compute_f1_scores(tp, fp, fn):
    """Calculates Precision, Recall, and F1."""
    precision = safe_div(tp, tp + fp)
    recall = safe_div(tp, tp + fn)
    f1 = safe_div(2 * precision * recall, precision + recall)
    return precision, recall, f1

def evaluate_contract(result):
    """Computes Clause-Level and Document-Level metrics for a single contract."""
    f1_binary_clause = {}
    f1_count_clause = {}

    eval_categories = list(CLAUSE_MAPPINGS.keys())
    run_modes = ["edge_only", "cloud_only", "hybrid"]

    # 1. CLAUSE-LEVEL MATH
    for cat in eval_categories:
        f1_binary_clause[cat] = {}
        f1_count_clause[cat] = {}
        
        for mode in run_modes:
            mode_res = result[mode]
            truth = mode_res["ground-truth"].get(cat, 0)
            pred = mode_res.get(cat, 0)
            
            # Binary — presence/absence only
            bin_tp = 1 if (pred > 0 and truth > 0) else 0
            bin_fp = 1 if (pred > 0 and truth == 0) else 0
            bin_fn = 1 if (pred == 0 and truth > 0) else 0
            bin_p, bin_r, bin_f1 = compute_f1_scores(bin_tp, bin_fp, bin_fn)

            f1_binary_clause[cat][mode] = {
                "TP": bin_tp, "FP": bin_fp, "FN": bin_fn,
                "Precision": round(bin_p, 4), "Recall": round(bin_r, 4), "F1": round(bin_f1, 4)
            }
            
            # Count-based — annotation count fidelity
            cnt_tp = min(truth, pred)
            cnt_fp = max(0, pred - truth)
            cnt_fn = max(0, truth - pred)
            cnt_p, cnt_r, cnt_f1 = compute_f1_scores(cnt_tp, cnt_fp, cnt_fn)

            f1_count_clause[cat][mode] = {
                "TP": cnt_tp, "FP": cnt_fp, "FN": cnt_fn,
                "Precision": round(cnt_p, 4), "Recall": round(cnt_r, 4), "F1": round(cnt_f1, 4)
            }

    # 2. DOCUMENT-LEVEL MATH (Aggregating all clauses for THIS contract)
    doc_binary = {}
    doc_count = {}
    
    for mode in run_modes:
        # Sum all Binary Clause scores together
        b_tp = sum(f1_binary_clause[cat][mode]["TP"] for cat in eval_categories)
        b_fp = sum(f1_binary_clause[cat][mode]["FP"] for cat in eval_categories)
        b_fn = sum(f1_binary_clause[cat][mode]["FN"] for cat in eval_categories)
        bp, br, bf1 = compute_f1_scores(b_tp, b_fp, b_fn)
        
        doc_binary[mode] = {
            "TP": b_tp, "FP": b_fp, "FN": b_fn,
            "Precision": round(bp, 4), "Recall": round(br, 4), "F1": round(bf1, 4)
        }

        # Sum all Count Clause scores together
        c_tp = sum(f1_count_clause[cat][mode]["TP"] for cat in eval_categories)
        c_fp = sum(f1_count_clause[cat][mode]["FP"] for cat in eval_categories)
        c_fn = sum(f1_count_clause[cat][mode]["FN"] for cat in eval_categories)
        cp, cr, cf1 = compute_f1_scores(c_tp, c_fp, c_fn)
        
        doc_count[mode] = {
            "TP": c_tp, "FP": c_fp, "FN": c_fn,
            "Precision": round(cp, 4), "Recall": round(cr, 4), "F1": round(cf1, 4)
        }

    return {
        "title": result["contract_title"],
        "clause_level": {"binary": f1_binary_clause, "count": f1_count_clause},
        "document_level": {"binary": doc_binary, "count": doc_count}
    }

def process_results():
    # 1. Load Data
    edge_only_results = load_json(os.path.join(TELEMETRY_FILES_PATH, "edge_only_telemetry_results.json"))
    cloud_only_results = load_json(os.path.join(TELEMETRY_FILES_PATH, "cloud_only_telemetry_results.json"))
    hybrid_results = load_json(os.path.join(TELEMETRY_FILES_PATH, "hybrid_telemetry_results.json"))
    ground_truths = load_json(GROUND_TRUTHS_PATH)

    results_per_contract = []

    # 2. Parse Raw Data per Contract
    for contract_filename, contract_data in ground_truths.items():
        c_edge = [r for r in edge_only_results if r.get("contractFilename") == contract_filename]
        c_cloud = [r for r in cloud_only_results if r.get("contractFilename") == contract_filename]
        c_hybrid = [r for r in hybrid_results if r.get("contractFilename") == contract_filename]

        curr_contract_truths = {
            "non-compete": contract_data["annotation_counts"].get("Non-Compete", 0),
            "termination-for-convenience": contract_data["annotation_counts"].get("Termination For Convenience", 0),
            "uncapped-liability": contract_data["annotation_counts"].get("Uncapped Liability", 0),
            "cap-on-liability": contract_data["annotation_counts"].get("Cap On Liability", 0),
        }

        contract = {
            "contract_title": contract_data.get("contract_title", "Unknown"),
            "edge_only": build_mode_metrics(c_edge, curr_contract_truths),
            "cloud_only": build_mode_metrics(c_cloud, curr_contract_truths),
            "hybrid": build_mode_metrics(c_hybrid, curr_contract_truths)
        }
        results_per_contract.append(contract)

    # 3. Process Individual Contracts (Clause & Document Level)
    all_evaluations = []
    for result in results_per_contract:
        all_evaluations.append(evaluate_contract(result))

    # 4. SYSTEM-LEVEL MATH (Aggregating all 50 Contracts)
    system_results = {"binary": {}, "count": {}}
    run_modes = ["edge_only", "cloud_only", "hybrid"]

    for eval_type in ["binary", "count"]:
        for mode in run_modes:
            # MICRO-AVERAGE: Sum up every single TP/FP/FN from all 50 contracts
            total_tp = sum(doc["document_level"][eval_type][mode]["TP"] for doc in all_evaluations)
            total_fp = sum(doc["document_level"][eval_type][mode]["FP"] for doc in all_evaluations)
            total_fn = sum(doc["document_level"][eval_type][mode]["FN"] for doc in all_evaluations)
            mic_p, mic_r, mic_f1 = compute_f1_scores(total_tp, total_fp, total_fn)

            # MACRO-AVERAGE: Get the average of the 50 distinct Document F1 scores
            f1_scores = [doc["document_level"][eval_type][mode]["F1"] for doc in all_evaluations]
            macro_f1 = sum(f1_scores) / len(f1_scores) if f1_scores else 0.0

            system_results[eval_type][mode] = {
                "Micro_Metrics": {
                    "Total_TP": total_tp, "Total_FP": total_fp, "Total_FN": total_fn,
                    "Precision": round(mic_p, 4), "Recall": round(mic_r, 4), "F1_Score": round(mic_f1, 4)
                },
                "Macro_F1_Score": round(macro_f1, 4)
            }

    # Output Final System Report
    print("="*60)
    print("FINAL SYSTEM-WIDE METRICS (ACROSS 50 CONTRACTS)")
    print("="*60)
    print(json.dumps(system_results, indent=2))
    
    # Save everything to file for thesis appendix
    with open("results/final_thesis_evaluation.json", "w") as out:
        json.dump({"system_summary": system_results, "contract_details": all_evaluations}, out, indent=2)
    print("\nSaved full detailed breakdown to 'final_thesis_evaluation.json'")

if __name__ == "__main__":
    process_results()