# Sample Projects for CCS Workbench

This file defines the sample projects available in the "Load Sample" dropdown.
The CCS Workbench reads this file at runtime to populate the sample projects list.

## Format

Each sample project is defined on a single line with the following format:

```
- filename.ccs: Display Name | mode | Description | era | annotation_count
```

**Fields:**
- `filename.ccs` - The project file (must end in .ccs)
- `Display Name` - How the project appears in the dropdown
- `mode` - One of: critique, archaeology, interpret, create
- `Description` - Brief description shown in the dropdown
- `era` - Optional era badge (e.g., "1960s", "1980s")
- `annotation_count` - Optional number of annotations

## Available Sample Projects

- eliza/eliza-1965b-CR.ccs: ELIZA (1965) - Annotated | critique | Complete critique session with 30+ scholarly annotations | 1960s | 30

## Adding Your Own Sample Projects

1. Create a complete project in the CCS Workbench
2. Save it as a .ccs file using File > Save
3. Place the .ccs file in this `public/sample-code/` folder
4. Add an entry to this file following the format above
5. Rebuild or restart the application

The project will appear in the "Load Sample" dropdown in the code files panel.
