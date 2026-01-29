# Fix Critical Issues - Action Plan

## What I've Done

### 1. Added Verbose Error Logging to `pushReply`
- **File**: [useAnnotationsSync.ts:345-372](/Users/hbp17/Projects/CCS-WB/src/hooks/useAnnotationsSync.ts#L345-L372)
- **What it does**: Now shows detailed error information (message, details, hint, code) when reply saves fail
- **Action needed**: Test creating a reply in the browser and check the console for detailed error messages

### 2. Created SQL Fix Files
- **Diagnostic queries**: [diagnostic_queries.sql](/Users/hbp17/Projects/CCS-WB/docs/sql/diagnostic_queries.sql)
- **Annotations RLS fix**: [fix_annotations_rls.sql](/Users/hbp17/Projects/CCS-WB/docs/sql/fix_annotations_rls.sql)

---

## What You Need to Do

### Step 1: Test Reply Saving with Verbose Logging
1. Open the CCS-WB app in your browser
2. Open browser console (F12)
3. Try to add a reply to an annotation
4. Look for console output starting with `pushReply:`
5. **Copy the error details** you see and share them with me

### Step 2: Run Diagnostic Queries in Supabase
1. Open Supabase SQL Editor
2. Run the queries in [diagnostic_queries.sql](/Users/hbp17/Projects/CCS-WB/docs/sql/diagnostic_queries.sql)
3. Look at the results for:
   - **Query 1-2**: Shows current RLS policies
   - **Query 3**: Shows cascade delete settings
   - **Query 6**: Confirms RLS is enabled

### Step 3: Fix Annotations RLS (if needed)
If annotations aren't syncing between clients, run [fix_annotations_rls.sql](/Users/hbp17/Projects/CCS-WB/docs/sql/fix_annotations_rls.sql) in Supabase.

**This will**:
- Allow all project members to see ALL annotations (not just their own)
- Keep the security rule that only project owners/members can access annotations

### Step 4: Fix Cascade Delete (if needed)
If Query 3 from diagnostics shows the `delete_rule` is NOT `CASCADE`, run:

```sql
ALTER TABLE public.annotation_replies
DROP CONSTRAINT IF EXISTS annotation_replies_annotation_id_fkey;

ALTER TABLE public.annotation_replies
ADD CONSTRAINT annotation_replies_annotation_id_fkey
FOREIGN KEY (annotation_id)
REFERENCES public.annotations(id)
ON DELETE CASCADE;
```

---

## Expected Outcomes

After running these fixes:

1. **Reply saving** should work with clear error messages if it still fails
2. **Annotations should sync** between browser windows (all users see all annotations in shared projects)
3. **Deleting an annotation** should automatically delete all its replies

---

## Next Steps After Testing

Once you've tested and shared the console output, I can:
- Fix any remaining issues with the RLS policies
- Adjust the code if the user object isn't being populated correctly
- Verify the cascade delete is working properly
