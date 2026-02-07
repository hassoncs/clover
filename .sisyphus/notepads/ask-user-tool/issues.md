# Issues

## Test Failure: submitAnswer waiting_for_input test

**Issue**: The test `allows submitAnswer when run is waiting_for_input` fails, but NOT due to the DB schema.

**Root Cause**: The test correctly inserts a run with `status='waiting_for_input'` into the test DB (schema now allows this). However, the `submitAnswer` endpoint makes a request to the RUN_COORDINATOR Durable Object, which returns an error saying the run has `status=queued`.

**What Was Fixed**: 
- DB schema in `test-utils.ts` now includes `waiting_for_input` in the CHECK constraint (line 227)
- Index definition updated to include `waiting_for_input` in WHERE clause (line 243)
- Both changes match production `schema.sql`

**What Still Needs Fixing**:
- The test needs the RUN_COORDINATOR Durable Object to be properly mocked/initialized with `waiting_for_input` status
- This is a test setup issue, not a schema issue
- The coordinator's internal state doesn't match the DB state in the test

**Evidence**: The negative test `rejects submitAnswer when run is not waiting_for_input` passes, proving the schema allows the status value.

