# Forward Selection Results — 50 Startups

| Number of Features | Selected Features | CV RMSE (train) | CV R² (train) | Test RMSE | Test R² | Decision |
|---|---|---|---|---|---|---|
| 1 | R&D Spend | 9,824.17 ± 3,289 | 0.9291 | 7,714.33 | 0.9265 | ✅ Selected |
| 2 | R&D Spend, Marketing Spend | 9,509.47 ± 3,055 | 0.9353 | 8,206.33 | 0.9168 |  |
| 3 | R&D Spend, Marketing Spend, Administration | 9,463.04 ± 3,037 | 0.9353 | 8,995.91 | 0.9001 |  |
| 4 | R&D Spend, Marketing Spend, Administration, State_Florida | 9,708.64 ± 3,015 | 0.9316 | 9,055.96 | 0.8987 |  |
| 5 | R&D Spend, Marketing Spend, Administration, State_Florida, State_New York | 10,137.80 ± 3,180 | 0.9252 | 9,055.96 | 0.8987 | Model B (all) |
