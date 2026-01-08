import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { performance } from 'node:perf_hooks';
import { AIResponseSchema, ReviewFormSchema, type ReviewDocument } from '@/lib/types';
import { getAdminDatabase } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

// Initialize Gemini AI (New SDK)
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map<string, number[]>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // NextRequest has an `ip` field in some runtimes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maybeIp = (request as any).ip as string | undefined;
  return maybeIp || 'unknown';
}

function isRateLimited(ip: string): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  const history = rateLimitStore.get(ip) ?? [];
  const fresh = history.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (fresh.length >= RATE_LIMIT_MAX) {
    const oldest = fresh[0] ?? now;
    const retryAfterMs = Math.max(0, RATE_LIMIT_WINDOW_MS - (now - oldest));
    return { limited: true, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
  }

  fresh.push(now);
  rateLimitStore.set(ip, fresh);
  return { limited: false, retryAfterSec: 0 };
}

export async function POST(request: NextRequest) {
  try {
    // Simple in-memory rate limiting (5 req/min per IP)
    const ip = getClientIp(request);
    const rl = isRateLimited(ip);
    if (rl.limited) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again shortly.',
          retryAfterSec: rl.retryAfterSec,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retryAfterSec),
          },
        }
      );
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = ReviewFormSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input', 
          details: validationResult.error.flatten() 
        },
        { status: 400 }
      );
    }

    const { rating, review } = validationResult.data;

    // JSON Schema for structured output (matches AIResponseSchema)
    const responseSchema = {
      type: 'object',
      properties: {
        response: {
          type: 'string',
          description: 'A polite, empathetic reply to the customer (2-3 sentences)',
        },
        summary: {
          type: 'string',
          description: 'A concise summary in 10 words or fewer',
        },
        action: {
          type: 'string',
          description: 'A concrete, actionable step for the team (1 sentence)',
        },
        sentiment_score: {
          type: 'integer',
          description: 'Sentiment score from 0 (very negative) to 100 (very positive)',
          minimum: 0,
          maximum: 100,
        },
        tags: {
          type: 'array',
          description: 'Up to 3 relevant tags',
          items: {
            type: 'string',
            enum: ['Quality', 'Price', 'Service', 'Delivery', 'App Experience'],
          },
          maxItems: 3,
        },
      },
      required: ['response', 'summary', 'action', 'sentiment_score', 'tags'],
    };

    const prompt = `Analyze the following customer review and provide your analysis.

Customer Rating (1-5): ${rating}
Customer Review: ${review}`;

    const start = performance.now();
    
    // Call Gemini AI (New SDK)
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const latencyMs = Math.max(0, Math.round(performance.now() - start));
    
    // Extract parsed JSON or fallback to text parsing
    let aiJson: unknown;

    // The JS SDK does not currently have a .parsed property like the Python SDK
    // We must parse the .text string manually.
    const text = response.text;
    if (text) {
      try {
        aiJson = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse AI response text:', text, e);
      }
    }

    if (!aiJson) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI response parsing failed',
          details: 'No parsed content or valid text returned',
        },
        { status: 500 }
      );
    }

    const parsedAi = AIResponseSchema.safeParse(aiJson);
    if (!parsedAi.success) {
      console.error('Invalid AI response structure:', parsedAi.error.flatten());
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid AI response structure',
        },
        { status: 500 }
      );
    }

    const aiData = parsedAi.data;

    const reviewData: ReviewDocument = {
      rating,
      reviewText: review,
      ai_response: aiData.response,
      ai_summary: aiData.summary,
      ai_action: aiData.action,
      ai_sentiment: Math.round(aiData.sentiment_score),
      ai_tags: aiData.tags ?? [],
      latency_ms: latencyMs,
      createdAt: Date.now(),
    };

    const database = getAdminDatabase();
    const reviewsRef = database.ref('reviews');
    await reviewsRef.push(reviewData);

    // Return success response with AI message
    return NextResponse.json({
      success: true,
      message: aiData.response,
    });

  } catch (error) {
    console.error('Error processing review:', error);

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
