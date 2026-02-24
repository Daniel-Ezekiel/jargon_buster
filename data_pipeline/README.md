# Jargon Buster

A data pipeline project for extracting, filtering, and enriching legal contract data from the **CUAD (Contract Understanding Atticus Dataset)** for use in AI/NLP research and compliance tooling.

---

## Overview

Jargon Buster processes real-world legal contracts from the CUAD dataset to produce a curated, enriched subset suitable for training or evaluating document understanding models. The pipeline:

1. Extracts contracts containing specific high-value legal clauses
2. Outputs a ranked subset of the 50 most clause-rich contracts as plain text
3. Injects realistic synthetic PII (Personally Identifiable Information) into each contract — simulating real-world compliance scenarios involving FCA, DORA, and GDPR-regulated data

---

## Project Structure

```
jargon_buster/
│
├── data_pipeline/
│   ├── CUAD_v1.json                # Source dataset (CUAD — 510 contracts)
│   ├── cuad_extract.py             # Stage 1: Extract and filter contracts
│   ├── cuad_inject_pii.py          # Stage 2: Inject synthetic PII
│   ├── cuad_subset_50_txt/         # Output of Stage 1 (50 plain text contracts)
│   └── cuad_subset_50_pii_txt/     # Output of Stage 2 (50 PII-enriched contracts)
│
└── README.md
```

---

## Data Pipeline

### Stage 1 — Contract Extraction (`cuad_extract.py`)

Reads `CUAD_v1.json` and filters contracts to those containing one or more of the following targeted legal clauses:

- **Non-Compete**
- **Termination For Convenience**
- **Uncapped Liability**
- **Cap On Liability**

Contracts are ranked by:

1. Number of distinct matching clauses found (descending)
2. Cumulative answer count across those clauses (descending)

The **top 50** contracts are saved as individual `.txt` files in `cuad_subset_50_txt/`.

#### Usage

```bash
cd data_pipeline
python cuad_extract.py
```

> **Note:** `CUAD_v1.json` must be present in the `data_pipeline/` directory before running.

---

### Stage 2 — PII Injection (`cuad_inject_pii.py`)

Reads each `.txt` contract from `cuad_subset_50_txt/` and appends a synthetically generated legal signatory block containing realistic but entirely fake PII, structured into two schedules:

**Schedule 1 — Payment, Notices & Signatory Details**

- Corporate identifiers (Company Registration Number, VAT number, FCA FRN)
- Financial settlement details (IBAN, SWIFT/BIC, Sort Code)
- Legal notice and billing contacts

**Schedule 2 — Regulatory Compliance, DORA & KYC Declarations**

- DORA cybersecurity incident response contact (CISO details)
- AML / Director Guarantee with UBO data (name, date of birth, National Insurance Number)
- Execution signatures with dates

Output is saved to `cuad_subset_50_pii_txt/`.

#### Usage

```bash
cd data_pipeline
python cuad_inject_pii.py
```

> **Note:** Stage 1 must be run first to populate `cuad_subset_50_txt/`.

---

## Dependencies

Install required Python packages:

```bash
pip install faker
```

| Package  | Purpose                                |
| -------- | -------------------------------------- |
| `faker`  | Generates synthetic PII data           |
| `json`   | Parses the CUAD dataset (stdlib)       |
| `os`     | File and directory management (stdlib) |
| `re`     | Filename sanitisation (stdlib)         |
| `random` | Random value generation (stdlib)       |

---

## Dataset

This project uses the **CUAD v1** dataset:

> **CUAD: An Expert-Annotated NLP Dataset for Legal Contract Review**  
> Atticus Project — [https://www.atticusprojectai.org/cuad](https://www.atticusprojectai.org/cuad)

The dataset contains 510 commercial legal contracts annotated across 41 legal clause categories.

---

## Notes

- All PII injected by `cuad_inject_pii.py` is **entirely synthetic** and generated using the [Faker](https://faker.readthedocs.io/) library. It does not represent any real individuals or organisations.
- The pipeline is designed to simulate realistic compliance scenarios for AI model evaluation, red-teaming, or PII detection research.
