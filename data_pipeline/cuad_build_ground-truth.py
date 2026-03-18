import os
import json
import re

OUTPUT_PATH = 'cuad_ground_truth'
OUTPUT_FILE = 'ground_truth'

# Create the directory if it doesn't exist and handle errors
try:
    if not os.path.exists(OUTPUT_PATH):
        os.mkdir(OUTPUT_PATH)
        print(f"Directory '{OUTPUT_PATH}' created successfully.")
except PermissionError:
    print(f"Permission denied: Unable to create '{OUTPUT_PATH}'.")
except Exception as e:
    print(f"An error occurred: {e}")

# Create ground_truth.json if it doesn't exist and handle errors
try:
    if not os.path.exists(f"{OUTPUT_PATH}/{OUTPUT_FILE}.json"):
        with open(f"{OUTPUT_PATH}/{OUTPUT_FILE}.json", 'w') as f:
            f.write(json.dumps({"data": {}}))
        print(f"File '{OUTPUT_FILE}' created successfully.")
except PermissionError:
    print(f"Permission denied: Unable to create '{OUTPUT_PATH}'.")
except Exception as e:
    print(f"An error occurred: {e}")

# FUNCTION TO PROCESS AND SELECT A SUBSET OF 50 CONTRACTS FROM THE CUAD DATASET
def process_cuad_benchmark():
    # Reading the content of the CUAD_v1 json file
    with open("CUAD_v1.json", "r", encoding="utf-8") as f:
        cuad_data = json.load(f)
        all_contracts = cuad_data["data"]

    selected_clauses = [
        "Non-Compete",
        "Termination For Convenience",
        "Uncapped Liability",
        "Cap On Liability"
    ]

    processed_contracts = []

    for contract in all_contracts:
        # qas = contract["paragraphs"][0]["qas"]
        contract_title =  contract['title']
        contract_context = ""
        found_clauses = []
        cummulative_answers_count = 0

        for paragraph in contract["paragraphs"]:
            qas = paragraph["qas"]
            contract_context = contract_context + paragraph["context"] + "\n\n"

            for qa in qas:
                qa_clause_name = qa["id"].split("__")[-1]
                if any(clause_name in qa_clause_name for clause_name in selected_clauses ) and not qa["is_impossible"]:
                    cummulative_answers_count += len(qa["answers"])
                    found_clauses.append({
                        qa_clause_name: True,
                        "qa_count": len(qa["answers"])
                    })

        if len(found_clauses) > 0:
            processed_contract = {
                "contract_title_sanitised": re.sub(r'[^a-zA-Z0-9_]', '', contract_title),
                "contract_title": contract_title,
                "found_clauses": found_clauses,
                "clauses_count": len(found_clauses),
                "cummulative_answers": cummulative_answers_count,
            }

            processed_contracts.append(processed_contract)

    processed_contracts.sort(reverse=True, key=lambda contract: (contract["clauses_count"], contract["cummulative_answers"]))
    ground_truths_subset = processed_contracts[slice(50)]

    ground_truths = {}
    
    for ground_truth in ground_truths_subset:
        contract_title_sanitised = re.sub(r'[^a-zA-Z0-9_]', '', ground_truth["contract_title"])
        ground_truths[contract_title_sanitised] = ground_truth

    with open(f"{OUTPUT_PATH}/ground_truth.json", "w", encoding="utf-8") as f:   
        f.write(json.dumps(ground_truths, indent=4))
    
if __name__ == "__main__":
    process_cuad_benchmark()
