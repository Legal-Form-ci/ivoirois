/**
 * Columns of `profiles` readable by any authenticated member.
 * Sensitive fields (phone_number, religion, marital_status) are protected at the
 * database level and only reachable by the owner via the `get_own_sensitive_profile` RPC.
 */
export const PROFILE_PUBLIC_COLUMNS =
  'id, username, full_name, avatar_url, bio, location, created_at, updated_at, region, profession, sector, position, experience_level, years_of_experience, education_level, interests, is_online, last_seen, cover_url';

/** Columns of `live_streams` readable by viewers (excludes the private stream_key). */
export const LIVE_STREAM_PUBLIC_COLUMNS =
  'id, host_id, title, description, thumbnail_url, status, privacy, viewers_count, peak_viewers, started_at, ended_at, scheduled_at, created_at, recording_url, recording_enabled';
