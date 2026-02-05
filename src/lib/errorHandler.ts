/**
 * Error handling utilities to prevent information leakage
 * Maps technical errors to user-friendly messages
 */

// PostgreSQL error codes mapping
const PG_ERROR_MAP: Record<string, string> = {
  '23505': 'Cet identifiant existe déjà',
  '23503': 'Référence invalide',
  '23502': 'Information requise manquante',
  '23514': 'Valeur non valide',
  '22001': 'Texte trop long',
  '42501': 'Accès non autorisé',
  '42P01': 'Ressource introuvable',
  'PGRST116': 'Ressource introuvable',
};

// Supabase Auth error codes mapping
const AUTH_ERROR_MAP: Record<string, string> = {
  'user_already_exists': 'Un compte existe déjà avec cet email',
  'email_taken': 'Cet email est déjà utilisé',
  'invalid_credentials': 'Identifiants incorrects',
  'invalid_login_credentials': 'Email ou mot de passe incorrect',
  'email_not_confirmed': 'Veuillez confirmer votre email',
  'user_not_found': 'Compte introuvable',
  'weak_password': 'Mot de passe trop faible (min. 6 caractères)',
  'over_request_rate_limit': 'Trop de tentatives, réessayez plus tard',
  'signup_disabled': 'Les inscriptions sont temporairement désactivées',
  'session_not_found': 'Session expirée, reconnectez-vous',
  'refresh_token_not_found': 'Session expirée, reconnectez-vous',
  'invalid_grant': 'Session invalide',
};

// Storage error codes mapping
const STORAGE_ERROR_MAP: Record<string, string> = {
  'Payload too large': 'Fichier trop volumineux',
  'The resource already exists': 'Ce fichier existe déjà',
  'mime type not allowed': 'Type de fichier non autorisé',
  'Bucket not found': 'Stockage non disponible',
};

interface ErrorWithCode {
  code?: string;
  error_code?: string;
  message?: string;
  status?: number;
  statusCode?: number;
}

/**
 * Maps technical error to user-friendly message
 * Logs detailed error for debugging while showing safe message to user
 */
export function mapToUserError(error: unknown): string {
  const DEFAULT_MESSAGE = 'Une erreur est survenue. Veuillez réessayer.';
  
  if (!error) return DEFAULT_MESSAGE;
  
  const err = error as ErrorWithCode;
  const code = err.code || err.error_code || '';
  const message = err.message || '';
  
  // Log for debugging (in production, send to monitoring service)
  if (import.meta.env.DEV) {
    console.error('[Error Handler]', { code, message, error });
  }
  
  // Check PostgreSQL errors
  if (PG_ERROR_MAP[code]) {
    return PG_ERROR_MAP[code];
  }
  
  // Check Auth errors
  if (AUTH_ERROR_MAP[code]) {
    return AUTH_ERROR_MAP[code];
  }
  
  // Check for auth errors in message
  for (const [key, value] of Object.entries(AUTH_ERROR_MAP)) {
    if (message.toLowerCase().includes(key.replace(/_/g, ' '))) {
      return value;
    }
  }
  
  // Check Storage errors
  for (const [key, value] of Object.entries(STORAGE_ERROR_MAP)) {
    if (message.includes(key)) {
      return value;
    }
  }
  
  // Check for specific patterns
  if (message.includes('duplicate key')) {
    return 'Cet élément existe déjà';
  }
  
  if (message.includes('violates foreign key')) {
    return 'Référence invalide';
  }
  
  if (message.includes('null value')) {
    return 'Information requise manquante';
  }
  
  if (message.includes('JWT') || message.includes('token')) {
    return 'Session expirée, reconnectez-vous';
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Problème de connexion. Vérifiez votre internet.';
  }
  
  // Rate limiting
  if (err.status === 429 || err.statusCode === 429) {
    return 'Trop de requêtes. Patientez quelques instants.';
  }
  
  // Server errors
  if (err.status === 500 || err.statusCode === 500) {
    return 'Erreur serveur. Réessayez plus tard.';
  }
  
  return DEFAULT_MESSAGE;
}

/**
 * Safe error handler for toast notifications
 */
export function handleError(error: unknown, fallbackMessage?: string): string {
  return mapToUserError(error) || fallbackMessage || 'Une erreur est survenue';
}
