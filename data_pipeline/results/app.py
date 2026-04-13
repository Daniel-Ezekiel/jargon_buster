import streamlit as st
import pandas as pd
import json

# --- 1. PAGE SETUP ---
st.set_page_config(page_title="Thesis F1 Evaluation", layout="wide")
st.title("⚖️ WebGPU Hybrid LLM Architecture: F1 Evaluation")

# --- 2. LOAD DATA ---
@st.cache_data
def load_data():
    with open("./final_thesis_evaluation.json", "r") as f:
        return json.load(f)

data = load_data()
system_summary = data["system_summary"]
contracts = data["contract_details"]

# --- 3. SIDEBAR NAVIGATION ---
st.sidebar.header("Navigation")
view = st.sidebar.radio("Select View:", ["System-Wide Overview", "Contract Deep Dive"])

# --- 4. VIEW: SYSTEM OVERVIEW ---
if view == "System-Wide Overview":
    st.header("Global System Performance (50 Contracts)")
    st.write("Comparing standard Binary NLP extraction against strict Count-Based fidelity.")
    
    # Extract System Metrics into a Dataframe for charting
    sys_data = []
    for eval_type in ["binary", "count"]:
        for mode in ["edge_only", "cloud_only", "hybrid"]:
            metrics = system_summary[eval_type][mode]["Micro_Metrics"]
            sys_data.append({
                "Evaluation": "Binary (One-and-done)" if eval_type == "binary" else "Count-Based (Strict)",
                "Architecture": mode.replace("_", " ").title(),
                "F1 Score": metrics["F1_Score"],
                "Precision": metrics["Precision"],
                "Recall": metrics["Recall"]
            })
    
    df_sys = pd.DataFrame(sys_data)
    
    # Split into columns for charting
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("F1 Score by Architecture")
        # Pivot for Streamlit Bar Chart
        f1_pivot = df_sys.pivot(index="Architecture", columns="Evaluation", values="F1 Score")
        st.bar_chart(f1_pivot)
        
    with col2:
        st.subheader("False Positives vs True Positives (Count-Based)")
        # Show raw totals for Count-based
        raw_counts = {
            "Edge Only": [system_summary["count"]["edge_only"]["Micro_Metrics"]["Total_TP"], system_summary["count"]["edge_only"]["Micro_Metrics"]["Total_FP"]],
            "Cloud Only": [system_summary["count"]["cloud_only"]["Micro_Metrics"]["Total_TP"], system_summary["count"]["cloud_only"]["Micro_Metrics"]["Total_FP"]],
            "Hybrid": [system_summary["count"]["hybrid"]["Micro_Metrics"]["Total_TP"], system_summary["count"]["hybrid"]["Micro_Metrics"]["Total_FP"]]
        }
        df_raw = pd.DataFrame(raw_counts, index=["True Positives", "False Positives"])
        st.bar_chart(df_raw.T)

# --- 5. VIEW: CONTRACT DEEP DIVE ---
elif view == "Contract Deep Dive":
    st.header("Document-Level Analysis")
    
    # Dropdown to select a specific contract
    contract_titles = [c["title"] for c in contracts]
    selected_title = st.selectbox("Select a Contract to Audit:", contract_titles)
    
    # Find the selected contract
    c_data = next(c for c in contracts if c["title"] == selected_title)
    
    st.subheader("Document-Level Math (Aggregated Clauses)")
    eval_choice = st.radio("Evaluation Metric:", ["Count-Based (Recommended)", "Binary"], horizontal=True)
    e_key = "count" if eval_choice == "Count-Based (Recommended)" else "binary"
    
    # Create metric cards for the 3 modes
    m_col1, m_col2, m_col3 = st.columns(3)
    edge = c_data["document_level"][e_key]["edge_only"]
    cloud = c_data["document_level"][e_key]["cloud_only"]
    hybrid = c_data["document_level"][e_key]["hybrid"]
    
    m_col1.metric("Edge Only (SLM)", f"F1: {edge['F1']}", f"Precision: {edge['Precision']}")
    m_col2.metric("Cloud Only (LLM)", f"F1: {cloud['F1']}", f"Precision: {cloud['Precision']}")
    m_col3.metric("Hybrid (WebGPU)", f"F1: {hybrid['F1']}", f"Precision: {hybrid['Precision']}")
    
    st.divider()
    st.write("Raw Breakdown:")
    st.json(c_data["document_level"][e_key])