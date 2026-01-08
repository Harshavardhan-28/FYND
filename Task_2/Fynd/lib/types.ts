import { z } from 'zod';

/**
 * User form input (kept for backward-compat with the existing User Dashboard).
 * The app currently POSTs { rating, review }.
 */
export const ReviewFormSchema = z.object({
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  review: z
    .string()
    .min(5, 'Review must be at least 5 characters')
    .max(1000, 'Review must be at most 1000 characters'),
});

export type ReviewFormData = z.infer<typeof ReviewFormSchema>;

/**
 * Allowed tags produced by AI (analytics taxonomy).
 */
export const AllowedTagSchema = z.enum([
  'Quality',
  'Price',
  'Service',
  'Delivery',
  'App Experience',
]);

export type AllowedTag = z.infer<typeof AllowedTagSchema>;

/**
 * AI response structure from Gemini (structured JSON).
 */
export const AIResponseSchema = z.object({
  response: z.string().min(1),
  summary: z.string().min(1),
  action: z.string().min(1),
  sentiment_score: z.number().min(0).max(100),
  tags: z.array(AllowedTagSchema).default([]),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;

/**
 * Stored review document in Firebase RTDB.
 */
export interface ReviewDocument {
  id?: string; // Firebase push ID
  rating: number; // 1-5
  reviewText: string;

  // AI Analysis
  ai_response: string;
  ai_summary: string;
  ai_action: string;
  ai_sentiment: number; // 0-100
  ai_tags: string[];

  // Engineering Metrics
  latency_ms: number;
  createdAt: number;
}

