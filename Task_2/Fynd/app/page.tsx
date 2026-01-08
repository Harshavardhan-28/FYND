'use client';

import { useState, useEffect } from 'react';
import { Star, Send, CheckCircle, AlertCircle, Sparkles, RefreshCcw } from 'lucide-react';
import { ReviewFormSchema, type ReviewFormData } from '@/lib/types';

export default function UserDashboard() {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [review, setReview] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Interactive States
  const [loadingText, setLoadingText] = useState('Connecting to server...');
  const [displayedResponse, setDisplayedResponse] = useState('');

  // Loading Text Effect
  useEffect(() => {
    if (!isLoading) return;
    const messages = ['Connecting to server...', 'Analyzing sentiment...', 'Drafting response...'];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingText(messages[i]);
    }, 800);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Typewriter Effect
  useEffect(() => {
    if (isSuccess && aiMessage) {
      let i = 0;
      setDisplayedResponse('');
      const interval = setInterval(() => {
        if (i < aiMessage.length) {
          setDisplayedResponse(aiMessage.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
        }
      }, 15);
      return () => clearInterval(interval);
    }
  }, [isSuccess, aiMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setIsError(false);
    setIsSuccess(false);
    setErrorMessage('');
    setAiMessage('');
    setDisplayedResponse('');
    setLoadingText('Connecting to server...');

    // Validate form data
    const formData: ReviewFormData = { rating, review };
    const validationResult = ReviewFormSchema.safeParse(formData);

    if (!validationResult.success) {
      setIsError(true);
      setErrorMessage(validationResult.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
        setAiMessage(data.message);
        // Reset form
        setRating(0);
        setReview('');
      } else {
        setIsError(true);
        setErrorMessage(data.error || 'Failed to submit review');
      }
    } catch {
      setIsError(true);
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-transform hover:scale-110 focus:outline-none"
            aria-label={`Rate ${star} stars`}
          >
            <Star
              className={`w-10 h-10 ${
                star <= (hoveredRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              } transition-colors`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Share Your Feedback
          </h1>
          <p className="text-gray-600">
            We value your opinion and continuously strive to improve
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 min-h-[500px] flex flex-col justify-center">
          {isSuccess ? (
             <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-2">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">We appreciate your feedback!</h2>
                <p className="text-gray-600">Your opinion helps us improve every day.</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500" />
                <div className="flex items-center gap-2 text-blue-700 font-semibold mb-3 text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Generated Reply</span>
                </div>
                <p className="text-gray-800 leading-relaxed font-medium">
                  {displayedResponse}
                  <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500 animate-pulse align-middle" />
                </p>
              </div>

              <button
                onClick={() => setIsSuccess(false)}
                className="w-full mt-4 bg-gray-900 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Submit Another Review
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                  How would you rate your experience?
                </label>
                {renderStars()}
                {rating > 0 && (
                  <p className="text-center text-sm text-gray-500 mt-2">
                    You rated: {rating} star{rating !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Review Section */}
              <div>
                <label htmlFor="review" className="block text-sm font-semibold text-gray-700 mb-2">
                  Tell us more about your experience
                </label>
                <textarea
                  id="review"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your thoughts, suggestions, or concerns..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
                  rows={6}
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {review.length}/1000 characters
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || rating === 0 || review.length < 5}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="animate-pulse">{loadingText}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Feedback
                  </>
                )}
              </button>
              
               {/* Error Message */}
              {isError && errorMessage && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 text-sm">Submission Error</h3>
                    <p className="text-red-800 text-sm mt-1">{errorMessage}</p>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Your feedback is processed securely and helps us serve you better
        </p>
      </div>
    </div>
  );
}
