#!/usr/bin/env python3
"""
Create test files in various formats for testing file upload functionality.
"""

import pandas as pd
import numpy as np

# Create sample data
np.random.seed(42)
n = 50

data = {
    'employee_id': range(1, n + 1),
    'department': np.random.choice(['Sales', 'Engineering', 'Marketing', 'HR'], n),
    'tenure_years': np.random.uniform(0.5, 15, n).round(1),
    'salary': np.random.normal(75000, 15000, n).round(0),
    'performance_score': np.random.uniform(1, 5, n).round(2),
    'satisfaction': np.random.randint(1, 11, n),
}

df = pd.DataFrame(data)

# Save as CSV (for comparison)
df.to_csv('employee_data.csv', index=False)
print("Created employee_data.csv")

# Save as Stata .dta
try:
    import pyreadstat
    pyreadstat.write_dta(df, 'employee_data.dta')
    print("Created employee_data.dta (Stata)")
except Exception as e:
    print(f"Error creating Stata file: {e}")

# Save as SPSS .sav
try:
    import pyreadstat
    pyreadstat.write_sav(df, 'employee_data.sav')
    print("Created employee_data.sav (SPSS)")
except Exception as e:
    print(f"Error creating SPSS file: {e}")

# Save as R .rds
try:
    import rdata
    # rdata doesn't support writing, use pyreadr instead if available
    # For now, we'll create a simple RDS file manually
    print("Note: rdata library doesn't support writing RDS files")
    print("Skipping employee_data.rds")
except Exception as e:
    print(f"Error with R file: {e}")

print("\nDone! Test files created in current directory.")
