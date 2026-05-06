import { supabase } from "@/integrations/supabase/client";

/**
 * Get a usable URL for a file in a private storage bucket.
 * Uses createSignedUrl with 1-hour expiry.
 * Falls back gracefully if the file doesn't exist.
 */
export async function getStorageUrl(
  bucket: string,
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null;
  
  // If it's already a full URL (e.g. from external source), return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600); // 1 hour

    if (error || !data?.signedUrl) {
      console.warn(`[storage] Failed to sign ${bucket}/${path}:`, error?.message);
      return null;
    }
    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Upload a file to a private bucket and return a signed URL.
 * Path format: userId/timestamp.ext (required by RLS policies)
 */
export async function uploadAndGetUrl(
  bucket: string,
  userId: string,
  file: File
): Promise<{ url: string; path: string } | null> {
  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) {
    console.error(`[storage] Upload to ${bucket} failed:`, uploadError);
    throw uploadError;
  }

  const url = await getStorageUrl(bucket, filePath);
  if (!url) throw new Error("Failed to get signed URL after upload");

  return { url, path: filePath };
}