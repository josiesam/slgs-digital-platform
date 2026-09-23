import { S3_BUCKET_CONFIG } from "../constants";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";

export type UploadedFile = {
  url: string;
  key?: string;
  name?: string;
  size?: number;
  type?: string;
};

interface UseUploadFileProps {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
}

export function useUploadFile({
  onUploadComplete,
  onUploadError,
}: UseUploadFileProps = {}) {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);

  async function uploadFile(file: File) {
    setIsUploading(true);
    setUploadingFile(file);
    setProgress(0);

    try {
      const s3Config = {
        s3Bucket: S3_BUCKET_CONFIG!,
      };

      if (
        !s3Config.s3Bucket?.accessKeyId ||
        !s3Config.s3Bucket?.secretAccessKey ||
        !s3Config.s3Bucket?.bucketName
      ) {
        throw new Error("S3 configuration is missing.");
      }

      const buffer = await file.arrayBuffer();
      const fileBuffer = new Uint8Array(buffer);

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split(".").pop() || "";
      const key = `uploads/${timestamp}-${randomSuffix}.${ext}`;

      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

      const s3Client = new S3Client({
        endpoint: s3Config.s3Bucket.endpoint,
        region: s3Config.s3Bucket.region || "us-east-1",
        credentials: {
          accessKeyId: s3Config.s3Bucket.accessKeyId,
          secretAccessKey: s3Config.s3Bucket.secretAccessKey,
        },
        forcePathStyle: true,
      });

      const command = new PutObjectCommand({
        Bucket: s3Config.s3Bucket.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: file.type,
      });

      // Fake progress (AWS SDK v3 limitation)
      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + Math.random() * 15, 90));
      }, 200);

      await s3Client.send(command);

      clearInterval(interval);
      setProgress(100);

      const baseUrl = s3Config.s3Bucket.accessUrl?.replace(/\/$/, "") || "";
      const encodedKey = key.split("/").map(encodeURIComponent).join("/");

      const result: UploadedFile = {
        url: `${baseUrl}/${encodedKey}`,
        key,
        name: file.name,
        size: file.size,
        type: file.type,
      };

      setUploadedFile(result);
      onUploadComplete?.(result);

      return result;
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
      onUploadError?.(error);
      console.debug("s3 error", error);

      throw error;
    } finally {
      setIsUploading(false);
      setUploadingFile(undefined);
      setProgress(0);
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile,
    uploadingFile,
  };
}

export function getErrorMessage(err: unknown) {
  const unknownError = "Something went wrong, please try again later.";

  if (err instanceof z.ZodError) {
    const errors = err.issues.map((issue) => issue.message);

    return errors.join("\n");
  }
  if (err instanceof Error) {
    return err.message;
  }
  return unknownError;
}
