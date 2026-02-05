import { z } from 'zod';

/**
 * Input validation schemas using Zod
 * Prevents XSS, spam, and database bloat
 */

// Profile validation
export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Le nom d\'utilisateur doit avoir au moins 3 caractères')
    .max(30, 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères')
    .regex(/^[a-zA-Z0-9_]+$/, 'Seuls les lettres, chiffres et _ sont autorisés'),
  full_name: z
    .string()
    .trim()
    .min(2, 'Le nom doit avoir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  phone_number: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, 'Le numéro doit contenir exactement 10 chiffres'),
  bio: z
    .string()
    .trim()
    .max(500, 'La bio ne peut pas dépasser 500 caractères')
    .optional()
    .nullable(),
  location: z
    .string()
    .trim()
    .max(100, 'La localisation ne peut pas dépasser 100 caractères')
    .optional()
    .nullable(),
  region: z
    .string()
    .trim()
    .max(100, 'La région ne peut pas dépasser 100 caractères')
    .optional()
    .nullable(),
});

// Post validation
export const postSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Le contenu ne peut pas être vide')
    .max(5000, 'Le contenu ne peut pas dépasser 5000 caractères'),
  title: z
    .string()
    .trim()
    .max(200, 'Le titre ne peut pas dépasser 200 caractères')
    .optional()
    .nullable(),
  hook: z
    .string()
    .trim()
    .max(300, 'L\'accroche ne peut pas dépasser 300 caractères')
    .optional()
    .nullable(),
});

// Comment validation
export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Le commentaire ne peut pas être vide')
    .max(1000, 'Le commentaire ne peut pas dépasser 1000 caractères'),
});

// Message validation
export const messageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Le message ne peut pas être vide')
    .max(2000, 'Le message ne peut pas dépasser 2000 caractères'),
});

// Event validation
export const eventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Le titre doit avoir au moins 3 caractères')
    .max(200, 'Le titre ne peut pas dépasser 200 caractères'),
  description: z
    .string()
    .trim()
    .max(5000, 'La description ne peut pas dépasser 5000 caractères')
    .optional()
    .nullable(),
  location: z
    .string()
    .trim()
    .max(200, 'La localisation ne peut pas dépasser 200 caractères')
    .optional()
    .nullable(),
});

// Marketplace listing validation
export const listingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Le titre doit avoir au moins 3 caractères')
    .max(200, 'Le titre ne peut pas dépasser 200 caractères'),
  description: z
    .string()
    .trim()
    .max(3000, 'La description ne peut pas dépasser 3000 caractères')
    .optional()
    .nullable(),
  price: z
    .number()
    .min(0, 'Le prix doit être positif')
    .max(999999999, 'Le prix est trop élevé'),
});

// Company validation
export const companySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Le nom doit avoir au moins 2 caractères')
    .max(200, 'Le nom ne peut pas dépasser 200 caractères'),
  description: z
    .string()
    .trim()
    .max(5000, 'La description ne peut pas dépasser 5000 caractères')
    .optional()
    .nullable(),
  email: z
    .string()
    .email('Email invalide')
    .max(255, 'L\'email ne peut pas dépasser 255 caractères')
    .optional()
    .nullable(),
  phone: z
    .string()
    .trim()
    .max(20, 'Le téléphone ne peut pas dépasser 20 caractères')
    .optional()
    .nullable(),
  website: z
    .string()
    .url('URL invalide')
    .max(500, 'L\'URL ne peut pas dépasser 500 caractères')
    .optional()
    .nullable()
    .or(z.literal('')),
});

// Group validation
export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Le nom doit avoir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  description: z
    .string()
    .trim()
    .max(2000, 'La description ne peut pas dépasser 2000 caractères')
    .optional()
    .nullable(),
});

// Auth validation
export const authSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Email invalide')
    .max(255, 'L\'email ne peut pas dépasser 255 caractères'),
  password: z
    .string()
    .min(6, 'Le mot de passe doit avoir au moins 6 caractères')
    .max(72, 'Le mot de passe ne peut pas dépasser 72 caractères'),
});

export const signupSchema = authSchema.extend({
  username: profileSchema.shape.username,
  full_name: profileSchema.shape.full_name,
  phone_number: profileSchema.shape.phone_number,
  region: z.string().min(1, 'Veuillez sélectionner une région'),
});

// Helper function to validate and get errors
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: boolean; 
  data?: T; 
  errors?: Record<string, string>;
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  
  return { success: false, errors };
}

// Sanitize HTML to prevent XSS (simple version)
export function sanitizeText(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
