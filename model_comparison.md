# Model Comparison — 50 Startups

| Model | # Features | Features | Test RMSE | Test MAE | Test R² | Test Adj R² | RepeatedKFold RMSE (5×10) | RepeatedKFold R² (5×10) |
|---|---|---|---|---|---|---|---|---|
| Model B (all features) | 5 | R&D Spend, Administration, Marketing Spend, State_Florida, State_New York | 9,055.96 | 6,961.48 | 0.8987 | 0.7721 | 9,899 ± 2,520 | 0.9226 ± 0.0399 |
| Forward Selection (1) | 1 | R&D Spend | 7,714.33 | 6,077.36 | 0.9265 | 0.9173 | 9,369 ± 2,750 | 0.9285 ± 0.0436 |
