# CCS-WB Project Notes

## Important Conventions

### WORKING.md Location
**IMPORTANT**: The project's WORKING.md file is NOT in this repository.

**Canonical location:**
```
/Users/hbp17/Library/Mobile Documents/com~apple~CloudDocs/Documents/RESEARCH/WritingLab/knowledge/CCS-WB/WORKING.md
```

**Why:**
- WORKING.md contains development notes and progress tracking
- Should NOT be committed to GitHub
- Stays in WritingLab knowledge folder alongside other research projects
- The `knowledge/` folder is gitignored

**When updating progress:**
- Always update the WritingLab version
- Never create a `knowledge/` folder in the project repo
- Never commit WORKING.md to GitHub

## Development Workflow

### Branch Strategy
- **`main`** - Production deployment on Vercel
- **`alpha-version`** - Permanent test server for development
  - Preview URL: `ccs-wb-git-alpha-version-*.vercel.app`
  - Merge to `main` only when stable

### Testing
- Test all changes on alpha-version branch first
- Verify builds complete successfully
- Check preview deployment before merging to main

## File Structure Notes

### Knowledge Management
- Project documentation lives in WritingLab, not in repo
- Keep the repo focused on code, not documentation
- Use PROJECT_NOTES.md (this file) for repo-specific reminders
