import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getAdminDatabase } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST() {
  try {
    // 1. Fetch last 50 reviews from Firebase
    const db = getAdminDatabase();
    // We fetch a bit more just in case, but 50 is the goal
    const snapshot = await db.ref('reviews').limitToLast(50).once('value');
    
    const reviewsData = snapshot.val();
    
    if (!reviewsData) {
      return NextResponse.json(
        { message: 'No reviews found to analyze.' },
        { status: 404 }
      );
    }

    // Convert object to array and simplify for token efficiency
    const reviewsList = Object.values(reviewsData).map((r: any) => ({
      rating: r.rating,
      text: r.reviewText || r.review, // Handle both field names if legacy data exists
      date: new Date(r.createdAt || r.timestamp).toISOString().split('T')[0],
      sentiment: r.ai_sentiment,
      tags: r.ai_tags
    }));

    // 2. Construct the prompt
    const prompt = `
      You are a Senior Customer Experience Analyst. 
      Analyze the following dataset of the last ${reviewsList.length} customer reviews for our product.

      Dataset:
      ${JSON.stringify(reviewsList)}

      Please generate a comprehensive Executive Summary in Markdown format. 
      Do not include the raw JSON in the output.
      
      Structure your report exactly as follows:

      # 📊 Executive Intelligence Report

      ## 1. Sentiment Velocity
      *   **Current Trend**: [Improving / Stable / Declining]
      *   **Analysis**: [1-2 sentences explaining why, referencing the feedback]

      ## 2. Critical Issue (The "Burning Platform")
      *   **The Issue**: [Name the #1 complaint]
      *   **Impact**: [High/Medium/Low]
      *   **Customer Voice**: [Quote a representative review snippet if possible]
      
      ## 3. "The Bright Spot" (Top Delight)
      *   **Feature/Aspect**: [What do they love?]
      *   **Why it wins**: [Brief explanation]

      ## 4. Strategic Recommendation
      *   **Action for Next Week**: [Specific, actionable advice for the product team]

      Keep it professional, concise, and impact-oriented.
    `;

    // 3. Call Gemini
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      config: {
        temperature: 0.4, // Low temperature for analytical consistency
        maxOutputTokens: 1000,
      }
    });

    const reportMarkdown = response.text || "Failed to generate report.";

    return NextResponse.json({ report: reportMarkdown });

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}
