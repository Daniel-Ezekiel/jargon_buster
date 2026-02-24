# Sovereignty Router (Jargon Buster) 🛡️

## Overview

The **Sovereignty Router** is a privacy-preserving, hybrid Edge/Cloud Natural Language Processing (NLP) architecture designed for commercial contract analysis.

Built as an MSc thesis project, this system addresses the severe data sovereignty risks associated with sending raw, highly sensitive legal and financial documents to third-party Cloud LLMs (like OpenAI). By leveraging **WebGPU** and **Transformers.js**, the router acts as a local Edge gateway that pre-processes text, classifies risk, and automatically redacts Personally Identifiable Information (PII) before safely routing sanitised data to the Cloud.

---

## Key Features

- **Hybrid Topology:** Combines zero-latency, private Edge AI (DistilBERT) with deep-reasoning Cloud LLMs (GPT-4o).
- **Automated Data Redaction:** Identifies and masks highly sensitive corporate and human PII, including IBANs, UK Sort Codes, National Insurance Numbers (NINOs), and CISO contact details.
- **Regulatory Compliance:** Designed strictly around the requirements of the FCA Consumer Duty, UK GDPR, and DORA (Digital Operational Resilience Act).
- **High-Density Benchmarking:** Utilises a custom-extracted subset of the Contract Understanding Atticus Dataset (CUAD), specifically targeting complex liability and termination clauses.

---

## Repository Structure

This project is structured as a **Monorepo** containing both the data engineering pipeline and the frontend web application.

```
jargon_buster/
│
├── data_pipeline/               # Python scripts for dataset extraction and augmentation
│   ├── cuad_extract.py          # Extracts top 50 high-density contracts from CUAD v1
│   ├── cuad_inject_pii.py       # Appends synthetic UK/US financial & DORA compliance data
│   ├── CUAD_v1.json             # Original source dataset (requires manual download)
│   ├── cuad_subset_50_txt/      # Output: Clean extracted contracts
│   └── cuad_subset_50_pii_txt/  # Output: Final benchmarking dataset with injected PII
│
├── web_app/                     # Next.js frontend and Edge AI implementation (upcoming)
│
└── README.md
```

---

## Phase 1: Data Pipeline Execution

The `data_pipeline/` directory contains the scripts required to generate the **"Ground Truth" benchmarking dataset**. It extracts multi-paragraph commercial contracts and injects realistic corporate billing and regulatory compliance schedules.

### Prerequisites

- Python 3.10+
- [Faker](https://faker.readthedocs.io/) library (for synthetic data generation)

```bash
pip install Faker
```

### Generating the Dataset

**Step 1 — Extract Clean Contracts**

Parse `CUAD_v1.json` and isolate the 50 most legally dense contracts:

```bash
python data_pipeline/cuad_extract.py
```

**Step 2 — Inject Synthetic PII**

Append highly structured, regulated financial and cybersecurity compliance data to each contract:

```bash
python data_pipeline/cuad_inject_pii.py
```

The final testing dataset will be available in the `cuad_subset_50_pii_txt/` directory.

---

## Phase 2: Web Application _(In Development)_

The `web_app/` directory will house the **Next.js** frontend, React components, and the browser-native **WebGPU** implementation of the Sovereignty Router logic.

---

## Academic Context

This repository represents the practical implementation for a **Master of Science (MSc) thesis in Software Engineering**.
