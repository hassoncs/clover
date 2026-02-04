#!/usr/bin/env npx tsx
import { createTRPCClient, httpLink } from '@trpc/client';
import type { AppRouter } from '../src/trpc/router';

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npx tsx api/scripts/process-job.ts <jobId>');
  process.exit(1);
}

const authToken = process.env.SLOPCADE_AUTH_TOKEN || 'dev-token';
const baseUrl = process.env.API_URL || 'http://localhost:8789';

const client = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: `${baseUrl}/trpc`,
      headers: { Authorization: `Bearer ${authToken}` },
    }),
  ],
});

async function main() {
  console.log(`Processing job: ${jobId}`);
  
  const result = await client.assetSystem.processGenerationJob.mutate({ jobId });
  
  console.log('\n✅ Processing complete!');
  console.log(`Succeeded: ${result.successCount}`);
  console.log(`Failed:    ${result.failCount}`);
  console.log(`Status:    ${result.status}`);
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
