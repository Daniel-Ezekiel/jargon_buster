import os
import json
import re

OUTPUT_PATH = 'cuad_subset_50_txt'

# Create the directory if it doesn't exist and handle errors
try:
    if not os.path.exists(OUTPUT_PATH):
        os.mkdir(OUTPUT_PATH)
        print(f"Directory '{OUTPUT_PATH}' created successfully.")
except PermissionError:
    print(f"Permission denied: Unable to create '{OUTPUT_PATH}'.")
except Exception as e:
    print(f"An error occurred: {e}")

# FUNCTION TO PROCESS AND SELECT A SUBSET OF 50 CONTRACTS FROM THE CUAD DATASET
def process_cuad_dataset():
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
        found_clauses = set()
        cummulative_answers_count = 0

        for paragraph in contract["paragraphs"]:
            qas = paragraph["qas"]
            contract_context = contract_context + paragraph["context"] + "\n\n"

            for qa in qas:
                qa_clause_name = qa["id"].split("__")[-1]
                if any(clause_name in qa_clause_name for clause_name in selected_clauses ) and not qa["is_impossible"]:
                    found_clauses.add(qa_clause_name)
                    cummulative_answers_count += len(qa["answers"])

        if len(found_clauses) > 0:
            processed_contract = {
                "contract_title": contract_title,
                "found_clauses": list(found_clauses),
                "clauses_count": len(found_clauses),
                "cummulative_answers": cummulative_answers_count,
                "context": contract_context
            }

            processed_contracts.append(processed_contract)

    processed_contracts.sort(reverse=True, key=lambda contract: (contract["clauses_count"], contract["cummulative_answers"]))
    
    contracts_subset = processed_contracts[slice(50)]
    
    for contract in contracts_subset:
        contract_title_sanitised = re.sub(r'[^a-zA-Z0-9_]', '', contract["contract_title"])

        with open(f"{OUTPUT_PATH}/{contract_title_sanitised}.txt", "w", encoding="utf-8") as f:
            f.write(contract["context"])
    
if __name__ == "__main__":
    process_cuad_dataset()
