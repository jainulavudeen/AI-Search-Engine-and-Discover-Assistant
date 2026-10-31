# Search Evaluation

15 queries (partial — 5 of 20 not yet judged; run without --judged-only to finish) · 217 judged query–result pairs · judges: `gemini-3.5-flash` (15 queries) · generated 2026-10-31

| System | NDCG@10 | MRR | P@5 | Recall@10 |
|--------|---------|-----|-----|-----------|
| Keyword | 0.619 | 0.633 | 0.293 | 0.642 |
| Hybrid | 0.844 | 0.875 | 0.293 | 0.816 |
| Hybrid + Rerank | 0.872 | 0.876 | 0.333 | 0.857 |

MRR, P@5 and Recall@10 count grade-2 ("relevant") results and average over the 15 queries whose pool contains at least one; NDCG@10 is graded and averages over all 15.

## NDCG@10 per query

| Query | Keyword | Hybrid | Hybrid + Rerank |
|-------|------|------|------|
| coding contests for AI beginners | 0.085 | 0.473 | 0.447 |
| ethical hacking events | 0.826 | 0.964 | 1.000 |
| hackathons in Chennai | 0.835 | 0.703 | 0.714 |
| scholarships for women in tech | 1.000 | 1.000 | 1.000 |
| money to pay for my college fees | 0.509 | 0.553 | 0.553 |
| learn to build mobile apps | 0.083 | 0.924 | 0.619 |
| internships for computer science students | 0.000 | 1.000 | 1.000 |
| cloud computing and devops competitions | 1.000 | 1.000 | 1.000 |
| healthcare technology hackathon | 0.497 | 0.616 | 0.965 |
| blockchain and crypto events | 1.000 | 1.000 | 1.000 |
| events for first year students | 0.835 | 0.944 | 0.971 |
| data science and machine learning workshops | 1.000 | 1.000 | 1.000 |
| startup and entrepreneurship programs | 0.000 | 1.000 | 1.000 |
| hackathons in Bangalore | 1.000 | 0.489 | 0.804 |
| competitive programming and DSA contests | 0.610 | 1.000 | 1.000 |
