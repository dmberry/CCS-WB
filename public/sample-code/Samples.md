# Sample Projects for CCS Workbench

This file defines the sample projects available in the "Load Sample" dropdown.
The CCS Workbench reads this file at runtime to populate the sample projects list.

## Format

Each sample project is defined on a single line with the following format:

```
- folder/filename.ccs: Display Name | mode | Description | era | annotation_count
```

**Fields:**
- `folder/filename.ccs` - Path to the project file (must end in .ccs)
- `Display Name` - How the project appears in the dropdown
- `mode` - One of: critique, archaeology, interpret, create
- `Description` - Brief description shown in the dropdown
- `era` - Optional era badge (e.g., "1960s", "1980s")
- `annotation_count` - Optional number of annotations

## Available Sample Projects

- eliza/eliza-1965b-CR.ccs: ELIZA (1965b) - Annotated | critique | Complete critique session with 30+ scholarly annotations | 1960s | 30
- apollo-11-comanche/comanche055.ccs: Apollo 11 - Comanche055 (CM, 1969) | critique | Command Module guidance computer source code | 1960s | 0
- apollo-11-luminary/luminary099.ccs: Apollo 11 - Luminary099 (LM, 1969) | critique | Lunar Module guidance computer source code | 1960s | 0

## Adding Your Own Sample Projects

1. Create a complete project in the CCS Workbench
2. Save it as a .ccs file using File > Save
3. Create a subfolder in `public/sample-code/` (e.g., `myproject/`)
4. Place the .ccs file in the subfolder
5. Add an entry to this file following the format above
6. Rebuild or restart the application

The project will appear in the "Load Sample" dropdown in the code files panel.
