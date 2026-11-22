/**
 * Provision the receipts bucket in S3Mock after `docker compose up`.
 *
 * S3Mock's `initialBuckets` is skipped when a rootDirectory volume is
 * mounted (see docker-compose.yml), so fresh environments start without
 * the bucket and receipt uploads fail. Idempotent: HEAD, then PUT if 404.
 * Uses the public (host-reachable) endpoint — never S3_ENDPOINT, which may
 * point at the docker-internal hostname.
 */

const endpoint = (process.env.S3_PUBLIC_ENDPOINT || "http://localhost:9090").replace(/\/+$/, "");
const bucket = process.env.S3_BUCKET || "receipts";
const url = `${endpoint}/${bucket}`;

const head = await fetch(url, { method: "HEAD" });
if (head.status === 404) {
  const put = await fetch(url, { method: "PUT" });
  if (!put.ok) {
    console.error(`[ensure-s3-bucket] failed to create "${bucket}" at ${url} (HTTP ${put.status})`);
    process.exit(1);
  }
  console.log(`[ensure-s3-bucket] created bucket "${bucket}" at ${endpoint}`);
} else if (!head.ok) {
  console.error(`[ensure-s3-bucket] bucket check for "${bucket}" at ${url} failed (HTTP ${head.status})`);
  process.exit(1);
}