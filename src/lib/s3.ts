import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:9090";
const S3_PUBLIC_ENDPOINT = process.env.S3_PUBLIC_ENDPOINT || "http://localhost:9090";
const S3_BUCKET = process.env.S3_BUCKET || "receipts";

// Client for server-side operations (internal endpoint).
export const s3 = new S3Client({
  endpoint: S3_ENDPOINT,
  region: process.env.AWS_DEFAULT_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "s3mock",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "s3mock",
  },
  forcePathStyle: true,
});

// Client for presigned URLs (public endpoint, browser-reachable).
const s3Public = new S3Client({
  endpoint: S3_PUBLIC_ENDPOINT,
  region: process.env.AWS_DEFAULT_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "s3mock",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "s3mock",
  },
  forcePathStyle: true,
});

export async function uploadReceipt(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getReceiptObject(key: string) {
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })
  );
  return result;
}

export async function headReceipt(key: string) {
  return s3.send(
    new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })
  );
}

export async function deleteReceiptObject(key: string) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })
  );
}

export async function getPresignedUploadUrl(key: string, contentType: string, sizeBytes: number) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: sizeBytes,
  });
  return getSignedUrl(s3Public, command, { expiresIn: 300 });
}

export async function getPresignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3Public, command, { expiresIn: 600 });
}
