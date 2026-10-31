# Search Evaluation

12 queries (partial — 8 of 20 not yet judged; run without --judged-only to finish) · 135 judged query–result pairs · judges: `gemini-3.5-flash` (12 queries) · generated 2026-10-31

| System | NDCG@10 | MRR | P@5 | Recall@10 |
|--------|---------|-----|-----|-----------|
| Keyword | 0.655 | 0.667 | 0.333 | 0.664 |
| Hybrid | 0.897 | 0.885 | 0.367 | 0.860 |
| Hybrid + Rerank | 0.909 | 0.887 | 0.383 | 0.887 |

MRR, P@5 and Recall@10 count grade-2 ("relevant") results and average over the 12 queries whose pool contains at least one; NDCG@10 is graded and averages over all 12.

## NDCG@10 per query

| Query | Keyword | Hybrid | Hybrid + Rerank |
|-------|------|------|------|
| coding contests for AI beginners | 0.085 | 0.473 | 0.447 |
| hackathons in Chennai | 0.835 | 0.840 | 0.936 |
| scholarships for women in tech | 1.000 | 1.000 | 1.000 |
| money to pay for my college fees | 0.494 | 0.553 | 0.553 |
| internships for computer science students | 0.000 | 1.000 | 1.000 |
| cloud computing and devops competitions | 1.000 | 1.000 | 1.000 |
| blockchain and crypto events | 1.000 | 1.000 | 1.000 |
| events for first year students | 0.835 | 0.944 | 0.971 |
| data science and machine learning workshops | 1.000 | 1.000 | 1.000 |
| startup and entrepreneurship programs | 0.000 | 1.000 | 1.000 |
| hackathons in Bangalore | 1.000 | 0.951 | 1.000 |
| competitive programming and DSA contests | 0.610 | 1.000 | 1.000 |
