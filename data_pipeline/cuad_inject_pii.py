import os
import random
from faker import Faker

fake = Faker(["en_GB", "en_US"])

INPUT_DIR = "cuad_subset_50_txt"
OUTPUT_DIR = "cuad_subset_50_pii_txt"

try:
    if not os.path.exists(OUTPUT_DIR):
        os.mkdir(OUTPUT_DIR)
        print(f"{OUTPUT_DIR} directory successfully created")
except Exception as e:
    print(f"An error occured while attempting to create directory: {e}")

def generate_fake_pii():
    """
    Generates a realistic B2B legal signatory block model containing advanced FCA, DORA, and GDPR compliance data.
    - This is categorised into two schedules and described as seen in the comments below
    """

    # Service Provider/Company Details
    provider_company = fake.company()
    provider_rep = fake.name()
    provider_email = f"{provider_rep.split(' ')[0].lower()}@{provider_company.replace(' ', '').replace(',', '').lower()}.co.uk"
    provider_phone = fake.phone_number()
    provider_address = fake.address().replace('\n', ', ')
    provider_crn = str(random.randint(10000000, 99999999)) # UK CRNs are 8 digits
    provider_vat = f"GB{random.randint(100000000, 999999999)}"
    
    # Service Receipient/Client Details
    client_company = fake.company()
    client_rep = fake.name()
    client_billing = fake.name()
    client_email = f"accounts.payable@{client_company.replace(' ', '').replace(',', '').lower()}.co.uk"
    client_address = fake.address().replace('\n', ', ')
    client_frn = str(random.randint(100000, 999999)) # FCA FRNs are typically 6 digits
    
    # Financial Identifiers
    iban = fake.iban()
    swift = fake.swift()
    sort_code = fake.bban()[0:6]

    # DORA / Cybersecurity Incident Contacts
    ciso_name = fake.name()
    ciso_phone = fake.phone_number()
    
    # UBO / KYC Data (High-Risk UK GDPR PII)
    ubo_dob = fake.date_of_birth(minimum_age=30, maximum_age=65).strftime('%d-%m-%Y')
    ubo_nino = f"{random.choice(['AB', 'CE', 'GH', 'JL'])}{random.randint(100000, 999999)}{random.choice(['A', 'B', 'C', 'D'])}"
    
    pii_text = f"""
====================================================================
SCHEDULE 1: PAYMENT, NOTICES, AND SIGNATORY DETAILS
====================================================================
1. CORPORATE IDENTIFIERS
Provider: {provider_company} | CRN: {provider_crn} | VAT: {provider_vat}
Client: {client_company} | FCA Firm Reference Number (FRN): {client_frn}

2. FINANCIAL SETTLEMENT
All payments owed by the Client shall be routed via the following designated UK account:
Bank SWIFT/BIC: {swift}
UK Sort Code: {sort_code}
International Bank Account Number (IBAN): {iban}

3. LEGAL NOTICES & BILLING
Notices to the Provider: {provider_rep}, Legal Counsel
Address: {provider_address}
Email: {provider_email} | Direct Dial: {provider_phone}

Notices/Invoices to the Client: {client_billing}, Accounts Payable
Registered Address: {client_address} 
Email: {client_email}

====================================================================
SCHEDULE 2: REGULATORY COMPLIANCE, DORA, & KYC DECLARATIONS
====================================================================
1. CYBERSECURITY & INCIDENT RESPONSE (DORA COMPLIANCE)
Pursuant to the Digital Operational Resilience Act (DORA), the Provider designates the following contact for immediate 24/7 reporting of critical ICT/cybersecurity incidents:
Chief Information Security Officer (CISO): {ciso_name}
24/7 Emergency Dial: {ciso_phone}
Secure PGP Email: incident-response@{provider_company.replace(' ', '').replace(',', '').lower()}.co.uk

2. ANTI-MONEY LAUNDERING (AML) & DIRECTOR GUARANTEE
The following Ultimate Beneficial Owner (UBO) / Director provides a personal guarantee regarding the execution of this contract:
Guarantor Name: {client_rep}
Date of Birth: {ubo_dob}
National Insurance Number (NINO): {ubo_nino}

3. EXECUTION
IN WITNESS WHEREOF, the authorized representatives have executed this Agreement.
Provider Signatory: {provider_rep} | Date: {fake.date_this_decade()}
Client Signatory: {client_rep} | Date: {fake.date_this_decade()}
====================================================================
"""

    return pii_text

def process_cuad_subset_with_pii():
    cuad_subset = [file for file in os.listdir(INPUT_DIR) if file.endswith(".txt")]

    try:
        for contract in cuad_subset:
            fake_pii = generate_fake_pii()

            with open(file=f"{INPUT_DIR}/{contract}", mode="r", encoding='utf-8') as f:
                contract_details = f.read()

            with open(file=f"{OUTPUT_DIR}/{contract}", mode="w", encoding="utf-8") as f:
                f.write(contract_details + fake_pii)

        print("All PIIs added successfully")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    process_cuad_subset_with_pii()