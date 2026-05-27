import os
import sys
import json
from pathlib import Path
from services.extraction import extract_text
from services.chunking import chunk_text
from services.vector_store import upsert_chunks
from services.analyzer import analyze_document_text
from services.rag_pipeline import run_rag_chat

def main():
    sample_doc_path = Path("sample_lease.txt")
    sample_doc_path.write_text("""
COMMERCIAL LEASE AGREEMENT

This Commercial Lease Agreement ("Lease") is made and effective this 1st day of June, 2024, by and between:
Landlord: Acme Property Management LLC, located at 123 Business Rd, Suite 100, Metropolis, NY 10001.
Tenant: Global Tech Solutions Inc., located at 456 Innovation Way, San Francisco, CA 94105.

1. PREMISES
Landlord hereby leases to Tenant and Tenant hereby leases from Landlord the property located at 789 Corporate Blvd, Floor 3, Metropolis, NY 10002 ("Premises").

2. TERM
The term of this Lease shall be for a period of five (5) years, commencing on July 1, 2024 ("Commencement Date"), and ending on June 30, 2029 ("Expiration Date").

3. RENT
Tenant agrees to pay Landlord as base rent the sum of $15,000 per month, due and payable on the first day of each calendar month. Late payments shall incur a penalty of 5% of the monthly rent if not received by the fifth day of the month.

4. SECURITY DEPOSIT
Upon execution of this Lease, Tenant shall deposit with Landlord the sum of $30,000 as a security deposit for the full and faithful performance of all terms and conditions of this Lease.

5. USE OF PREMISES
The Premises shall be used exclusively for general office purposes and software development. Tenant shall not use the Premises for any illegal or hazardous purpose.

6. MAINTENANCE AND REPAIRS
Tenant shall keep the Premises in good, clean, and tenantable condition. Landlord shall be responsible for structural repairs and maintenance of the exterior of the building.

7. TERMINATION
In the event of a material breach of this Lease by Tenant, Landlord may terminate this Lease upon 30 days written notice, provided the breach is not cured within said 30-day period.

IN WITNESS WHEREOF, the parties have executed this Lease as of the date first above written.
""")

    user_id = "test_user"
    document_id = "test_doc_001"
    
    print("1. Extracting text...")
    extracted_text = extract_text(sample_doc_path)
    
    print("2. Chunking text...")
    chunks = chunk_text(extracted_text, chunk_size=50, chunk_overlap=10)
    print(f"   Created {len(chunks)} chunks.")
    
    print("3. Upserting to ChromaDB...")
    upsert_chunks(user_id=user_id, document_id=document_id, filename="sample_lease.txt", chunks=chunks)
    print("   Stored in DB.")
    
    print("\n=== AI ANALYSIS (Phase 2) ===")
    analysis = analyze_document_text(extracted_text, explanation_mode="normal")
    print("SUMMARY:", analysis['summary'])
    print("SHORT SUMMARY:", analysis['short_summary'])
    print("ENTITIES:", json.dumps(analysis['entities'], indent=2))
    print("CLAUSES:", json.dumps(analysis['clauses'], indent=2))
    
    print("\n=== RAG CHAT (Phase 3) ===")
    query = "What is the monthly rent and is there a late fee?"
    print("USER QUERY:", query)
    
    chat_result = run_rag_chat(
        user_id=user_id,
        document_id=document_id,
        query=query,
        top_k=3,
        chat_history=[],
        document_summary=analysis['summary'],
        entities=analysis['entities']
    )
    print("AI RESPONSE:", chat_result['answer'])
    print("SOURCES USED:", [s['text'][:50] + "..." for s in chat_result['sources']])

if __name__ == "__main__":
    main()
