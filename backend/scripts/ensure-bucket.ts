/**
 * Idempotent bucket bootstrapping for dev S3 backends (RustFS) and Cloudflare R2 alike.
 * Usage: npm run s3:init   (or via docker-compose rustfs-init)
 */
import 'dotenv/config';
import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: process.env.R2_REGION ?? 'us-east-1',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? 'minioadmin',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? 'minioadmin',
  },
  forcePathStyle: true,
});

async function main() {
  const Bucket = process.env.R2_BUCKET_NAME ?? 'lms-attachments';
  try {
    await client.send(new HeadBucketCommand({ Bucket }));
    console.log(`bucket exists: ${Bucket}`);
    return;
  } catch {
    // fall through to create
  }
  await client.send(new CreateBucketCommand({ Bucket }));
  console.log(`bucket created: ${Bucket}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
