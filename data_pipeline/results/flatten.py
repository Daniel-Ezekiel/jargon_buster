import json
import csv

# 1. Load the nested JSON
with open("./final_thesis_evaluation.json", "r") as f:
    data = json.load(f)

# 2. Prepare the CSV file
csv_filename = "thesis_flat_data.csv"

# These are the column headers for Power BI / Tableau
headers = [
    "Contract_Title", 
    "Evaluation_Method", 
    "Architecture", 
    "Level", 
    "Clause_Type", 
    "TP", "FP", "FN", 
    "Precision", "Recall", "F1_Score"
]

with open(csv_filename, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(headers)

    for contract in data["contract_details"]:
        title = contract["title"]
        
        for eval_method in ["binary", "count"]:
            
            # --- EXTRACT CLAUSE-LEVEL DATA ---
            for clause, modes in contract["clause_level"][eval_method].items():
                for architecture, metrics in modes.items():
                    writer.writerow([
                        title, 
                        eval_method.title(), 
                        architecture.replace("_", " ").title(), 
                        "Clause-Level",
                        clause.replace("-", " ").title(),
                        metrics["TP"], metrics["FP"], metrics["FN"],
                        metrics["Precision"], metrics["Recall"], metrics["F1"]
                    ])
            
            # --- EXTRACT DOCUMENT-LEVEL DATA ---
            for architecture, metrics in contract["document_level"][eval_method].items():
                writer.writerow([
                        title, 
                        eval_method.title(), 
                        architecture.replace("_", " ").title(), 
                        "Document-Level",
                        "ALL CLAUSES AGGREGATED",
                        metrics["TP"], metrics["FP"], metrics["FN"],
                        metrics["Precision"], metrics["Recall"], metrics["F1"]
                    ])

print(f"✅ Successfully flattened JSON into {csv_filename}!")
print("You can now import this directly into Power BI, Tableau, or Excel.")