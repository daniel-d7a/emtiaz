/**
 * Idempotent bucket bootstrapping for dev S3 backends (RustFS) and Cloudflare R2 alike.
 * Usage: npm run s3:init   (or via docker-compose rustfs-init)
 */
import 'dotenv/config';
import { CreateBucketCommand, HeadBucketCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: process.env.R2_REGION ?? 'us-east-1',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? 'rustfsadmin',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? 'rustfsadmin',
  },
  forcePathStyle: true,
});

async function main() {
  const Bucket = process.env.R2_BUCKET_NAME ?? 'lms-attachments';
  try {
    await client.send(new HeadBucketCommand({ Bucket }));
    console.log(`bucket exists: ${Bucket}`);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket }));
    console.log(`bucket created: ${Bucket}`);
  }

  const origins = [...new Set([
    process.env.FRONTEND_URL ?? 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:8088',
  ])];
  await client.send(new PutBucketCorsCommand({
    Bucket,
    CORSConfiguration: {
      CORSRules: [{
        AllowedOrigins: origins,
        AllowedMethods: ['GET', 'PUT', 'HEAD'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
      }],
    },
  }));
  console.log(`bucket CORS set for: ${origins.join(', ')}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
