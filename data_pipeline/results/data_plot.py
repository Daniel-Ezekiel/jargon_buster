import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# 1. Load the CSV
df = pd.read_csv("thesis_flat_data.csv")

# 2. Filter for System/Document Level Data
df_docs = df[df["Level"] == "Document-Level"]

# --- CHART 1: F1 Comparison (Binary vs Count) ---
plt.figure(figsize=(10, 6))
sns.barplot(
    data=df_docs, x="Architecture", y="F1_Score", 
    hue="Evaluation_Method", ci=None, palette="mako"
)
plt.title("Average Document F1 Score by Architecture", fontsize=16)
plt.ylim(0, 1.1)
plt.ylabel("Macro F1 Score")
plt.tight_layout()
plt.savefig("thesis_chart_1.png", dpi=300)
plt.show()

# --- CHART 2: Precision vs Recall (Count-Based) ---
df_count = df_docs[df_docs["Evaluation_Method"] == "Count"]
df_melted = df_count.melt(
    id_vars=["Architecture"], 
    value_vars=["Precision", "Recall", "F1_Score"], 
    var_name="Metric", value_name="Score"
)

plt.figure(figsize=(10, 6))
sns.barplot(
    data=df_melted, x="Architecture", y="Score", 
    hue="Metric", ci=None, palette="rocket"
)
plt.title("Precision vs. Recall Breakdown (Count-Based)", fontsize=16)
plt.ylim(0, 1.1)
plt.tight_layout()
plt.savefig("thesis_chart_2.png", dpi=300)
plt.show()

# --- CHART 3: Boxplot Variance ---
plt.figure(figsize=(10, 6))
sns.boxplot(
    data=df_count, x="Architecture", y="F1_Score", palette="vlag"
)
sns.stripplot(
    data=df_count, x="Architecture", y="F1_Score", 
    color=".3", linewidth=1, alpha=0.5
)
plt.title("Variance of F1 Scores Across 50 Contracts", fontsize=16)
plt.ylabel("F1 Score per Contract")
plt.tight_layout()
plt.savefig("thesis_chart_3.png", dpi=300)
plt.show()