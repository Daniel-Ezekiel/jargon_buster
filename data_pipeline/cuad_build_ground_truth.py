import os
import json
import re

CUAD_PATH = "CUAD_v1.json"
EXTRACTED_PATH = "cuad_subset_50_txt"
OUTPUT_PATH = "cuad_ground_truth"
OUTPUT_FILE = "ground_truth.json"

SELECTED_CLAUSES = [
    "Non-Compete",
    "Termination For Convenience",
    "Uncapped Liability",
    "Cap On Liability"
]

try:
    if not os.path.exists(OUTPUT_PATH):
        os.mkdir(OUTPUT_PATH)
        print(f"Directory '{OUTPUT_PATH}' created successfully.")
except PermissionError:
    print(f"Permission denied: Unable to create '{OUTPUT_PATH}'.")
except Exception as e:
    print(f"An error occurred creating directory: {e}")


def process_cuad_ground_truth():
    with open(CUAD_PATH, "r", encoding="utf-8") as f:
        cuad_data = json.load(f)

    # Get sanitised filenames of the 50 extracted contracts
    extracted_files = {
        re.sub(r'[^a-zA-Z0-9_]', '', f.replace(".txt", ""))
        for f in os.listdir(EXTRACTED_PATH)
        if f.endswith(".txt")
    }

    ground_truth = {}
    matched_count = 0

    for contract in cuad_data["data"]:
        title_sanitised = re.sub(r'[^a-zA-Z0-9_]', '', contract["title"])

        if title_sanitised not in extracted_files:
            continue

        # Flat boolean dict — contract-level binary classification
        # True if any QA annotation for this clause exists and is not impossible
        found_clauses = {clause: False for clause in SELECTED_CLAUSES}

        # Annotation counts kept for reference and future segment-level work
        # Not used in F1 calculation but preserved for Chapter 6 discussion
        annotation_counts = {clause: 0 for clause in SELECTED_CLAUSES}

        for paragraph in contract["paragraphs"]:
            for qa in paragraph["qas"]:
                qa_clause_name = qa["id"].split("__")[-1]
                for clause in SELECTED_CLAUSES:
                    if clause in qa_clause_name and not qa["is_impossible"]:
                        found_clauses[clause] = True
                        annotation_counts[clause] += len(qa["answers"])

        ground_truth[title_sanitised + ".txt"] = {
            "contract_title": contract["title"],
            "found_clauses": found_clauses,
            "annotation_counts": annotation_counts,
            "clauses_present_count": sum(found_clauses.values()),
            "total_annotations": sum(annotation_counts.values())
        }
        matched_count += 1

    ground_truth_sorted = dict(sorted(ground_truth.items(), key=lambda truth: (truth[1]["clauses_present_count"], truth[1]["total_annotations"]), reverse=True))

    with open(f"{OUTPUT_PATH}/{OUTPUT_FILE}", "w", encoding="utf-8") as f:
        json.dump(ground_truth_sorted, f, indent=4)

    print(f"Ground truth written for {matched_count} contracts.")
    print(f"Expected 50. {'OK - Found 50' if matched_count == 50 else 'WARNING: mismatch - check sanitised filename logic.'}")

    # Sanity check — print clause distribution across the 50 contracts
    for clause in SELECTED_CLAUSES:
        count = sum(
            1 for value in ground_truth.values()
            if value["found_clauses"][clause]
        )
        print(f"  {clause}: present in {count}/50 contracts")


if __name__ == "__main__":
    process_cuad_ground_truth()