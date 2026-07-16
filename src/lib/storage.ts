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

/**
 * Extract a bucket-relative storage path from either a raw path
 * or a full (possibly expired) signed URL like:
 *   https://xxx.supabase.co/storage/v1/object/sign/<bucket>/<path>?token=...
 */
export function extractStoragePath(bucket: string, value?: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("http")) return value;
  const marker = `/${bucket}/`;
  const idx = value.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(value.slice(idx + marker.length).split("?")[0]);
}

/**
 * Re-sign an array of media URLs stored for a bucket. Keeps external URLs
 * untouched, drops entries we can neither resolve nor re-sign.
 */
export async function refreshMediaUrls(
  bucket: string,
  urls: (string | null | undefined)[] | null | undefined
): Promise<string[]> {
  if (!urls || urls.length === 0) return [];
  const out = await Promise.all(
    urls.map(async (u) => {
      if (!u) return null;
      const path = extractStoragePath(bucket, u);
      if (!path) return u; // external URL, keep as-is
      const fresh = await getStorageUrl(bucket, path);
      return fresh ?? u;
    })
  );
  return out.filter((v): v is string => !!v);
}