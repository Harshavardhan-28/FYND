'use client';

import { useEffect, useState } from 'react';
import { database } from '@/lib/firebase';
import { ref, query, limitToLast, onValue, off, type DataSnapshot } from 'firebase/database';
import type { ReviewDocument } from '@/lib/types';
import { 
  Star, MessageSquare, Lightbulb, Tags, HeartPulse, Zap, X, Eye, 
  Download, ThumbsUp, ThumbsDown, Filter, Trash2 
} from 'lucide-react';

interface ReviewWithId extends ReviewDocument {
  id: string;
}

export default function AdminDashboard() {
  const [reviews, setReviews] = useState<ReviewWithId[]>([]);
  const [selectedReview, setSelectedReview] = useState<ReviewWithId | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Interactive Filters
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  // AI Feedback State
  const [aiRatings, setAiRatings] = useState<Record<string, 'up' | 'down'>>({});

  // Analytics
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : '0.0';

  const averageSentiment = totalReviews > 0
    ? (
        reviews.reduce((sum, r) => sum + (typeof r.ai_sentiment === 'number' ? r.ai_sentiment : 0), 0) /
        totalReviews
      ).toFixed(0)
    : '0';

  const averageLatency = totalReviews > 0
    ? (
        reviews.reduce((sum, r) => sum + (typeof r.latency_ms === 'number' ? r.latency_ms : 0), 0) /
        totalReviews
      ).toFixed(0)
    : '0';

  const topTags = (() => {
    const counts = new Map<string, number>();
    for (const review of reviews) {
      const tags = Array.isArray(review.ai_tags) ? review.ai_tags : [];
      for (const t of tags) {
        const tag = (t || '').trim();
        if (!tag) continue;
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  })();

  useEffect(() => {
    // Setup Firebase real-time listener
    const reviewsRef = ref(database, 'reviews');
    const reviewsQuery = query(reviewsRef, limitToLast(50));

    const toRecord = (value: unknown): Record<string, unknown> =>
      value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

    const getNumber = (value: unknown, fallback = 0): number =>
      typeof value === 'number' && Number.isFinite(value) ? value : fallback;

    const getString = (value: unknown, fallback = ''): string =>
      typeof value === 'string' ? value : fallback;

    const getStringArray = (value: unknown): string[] =>
      Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

    const handleData = (snapshot: DataSnapshot) => {
      try {
        const data = snapshot.val() as unknown;
        if (data) {
          const entries = Object.entries(toRecord(data));
          const reviewsList: ReviewWithId[] = entries.map(([id, value]) => {
            const v = toRecord(value);
            return {
              id,
              rating: getNumber(v.rating),
              reviewText: getString(v.reviewText, getString(v.review)),
              ai_response: getString(v.ai_response),
              ai_summary: getString(v.ai_summary),
              ai_action: getString(v.ai_action),
              ai_sentiment: getNumber(v.ai_sentiment),
              ai_tags: getStringArray(v.ai_tags),
              latency_ms: getNumber(v.latency_ms),
              createdAt: getNumber(v.createdAt, getNumber(v.timestamp)),
            };
          });

          // Sort by createdAt (newest first)
          reviewsList.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
          setReviews(reviewsList);
        } else {
          setReviews([]);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error processing reviews:', err);
        setError('Failed to load reviews');
        setIsLoading(false);
      }
    };

    const handleError = (err: unknown) => {
      console.error('Firebase error:', err);
      setError('Connection error. Please check your Firebase configuration.');
      setIsLoading(false);
    };

    // Attach listener
    onValue(reviewsQuery, handleData, handleError);

    // Cleanup
    return () => {
      off(reviewsQuery);
    };
  }, []);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1" title={`${rating}/5 Stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderTags = (tags: string[]) => {
    if (!Array.isArray(tags) || tags.length === 0) {
      return <span className="text-xs text-gray-400">—</span>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
          >
            {tag}
          </span>
        ))}
      </div>
    );
  };

  const filteredReviews = reviews.filter(review => {
    if (filterTag && (!review.ai_tags || !review.ai_tags.includes(filterTag))) return false;
    if (filterRating && review.rating !== filterRating) return false;
    return true;
  });

  const handleExportCSV = () => {
    if (filteredReviews.length === 0) return;

    const headers = ['ID', 'Date', 'Rating', 'Review', 'Sentiment', 'Summary', 'Tags', 'Latency (ms)'];
    const csvRows = [headers.join(',')];

    for (const row of filteredReviews) {
      const date = new Date(row.createdAt).toISOString();
      const tags = (row.ai_tags || []).join(';');
      const escape = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;
      
      const values = [
        row.id,
        date,
        row.rating,
        escape(row.reviewText),
        row.ai_sentiment,
        escape(row.ai_summary),
        escape(tags),
        row.latency_ms
      ];
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reviews_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleRateAI = (e: React.MouseEvent, id: string, rating: 'up' | 'down') => {
    e.stopPropagation();
    setAiRatings(prev => ({ ...prev, [id]: rating }));
    console.log(`AI rated for review ${id}: ${rating === 'up' ? 'Accurate' : 'Inaccurate'}`);
  };
    
  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Review Details Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 sticky top-0 backdrop-blur-md">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Review Details</h3>
                <p className="text-sm text-gray-500 font-mono mt-1">ID: {selectedReview.id}</p>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-8">
              {/* Customer Feedback Section */}
              <section className="space-y-4">
                <h4 className="text-sm uppercase tracking-wide text-gray-500 font-semibold border-b border-gray-100 pb-2">
                  Customer Feedback
                </h4>
                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    {renderStars(selectedReview.rating)}
                    <span className="text-sm text-gray-500">{formatDate(selectedReview.createdAt)}</span>
                  </div>
                  <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
                    {selectedReview.reviewText}
                  </p>
                </div>
              </section>

              {/* AI Analysis Section */}
              <section className="space-y-4">
                <h4 className="text-sm uppercase tracking-wide text-gray-500 font-semibold border-b border-gray-100 pb-2">
                  AI Intelligence
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-blue-200 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-blue-700 font-medium">
                      <HeartPulse className="w-4 h-4" />
                      Sentiment Analysis
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-gray-900">{selectedReview.ai_sentiment}</span>
                      <span className="text-sm text-gray-500 mb-1">/100</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full mt-3">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${selectedReview.ai_sentiment >= 70 ? 'bg-green-500' : selectedReview.ai_sentiment >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                        style={{ width: `${selectedReview.ai_sentiment}%` }} 
                      />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-purple-200 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-purple-700 font-medium">
                      <Tags className="w-4 h-4" />
                      Classified Tags
                    </div>
                    <div className="mt-2">
                      {renderTags(selectedReview.ai_tags)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-amber-800 mb-1 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" /> Recommended Action
                    </h5>
                    <p className="text-amber-900">{selectedReview.ai_action}</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                   <h5 className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> AI Generated Reply
                    </h5>
                    <p className="text-blue-900 italic">&quot;{selectedReview.ai_response}&quot;</p>
                  </div>
                </div>
              </section>

              {/* Technical Metrics Section */}
              <section className="space-y-4">
                <h4 className="text-sm uppercase tracking-wide text-gray-500 font-semibold border-b border-gray-100 pb-2">
                  Engineering Metrics
                </h4>
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span>Processing Latency: <span className="font-mono font-medium text-gray-900">{selectedReview.latency_ms}ms</span></span>
                  </div>
                </div>
              </section>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 sticky bottom-0 text-right">
              <button
                onClick={() => setSelectedReview(null)}
                className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time customer feedback analytics</p>
          </div>
          
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalReviews}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-3xl font-bold text-gray-900">{averageRating}</p>
                  <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                </div>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Star className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Sentiment</p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-3xl font-bold text-gray-900">{averageSentiment}</p>
                  <p className="text-sm text-gray-500">/100</p>
                </div>
              </div>
              <div className="bg-rose-100 p-3 rounded-full">
                <HeartPulse className="w-8 h-8 text-rose-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Latency</p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-3xl font-bold text-gray-900">{averageLatency}</p>
                  <p className="text-sm text-gray-500">ms</p>
                </div>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Zap className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Tags */}
        <div className="bg-white rounded-lg shadow border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Tags className="w-5 h-5 text-gray-700" />
              Top Tags
            </h2>
             {filterTag && (
              <button 
                onClick={() => setFilterTag(null)}
                className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1 font-medium"
              >
                <X className="w-3 h-3" /> Clear Tag Filter
              </button>
            )}
          </div>
          <div className="p-6">
            {topTags.length === 0 ? (
              <p className="text-sm text-gray-500">No tags yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {topTags.map(([tag, count]) => {
                  const isActive = filterTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setFilterTag(isActive ? null : tag)}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-all
                        ${isActive 
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600 ring-offset-2' 
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                    >
                      <span className="font-medium">{tag}:</span>
                      <span>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Data Table Header with Controls */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              Recent Feedback
            </h2>

            <div className="flex items-center gap-3">
              {(filterTag || filterRating) && (
                <button
                  onClick={() => { setFilterTag(null); setFilterRating(null); }}
                  className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1 px-2 py-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear Filters
                </button>
              )}
              
              <div className="relative flex items-center">
                 <Filter className="w-4 h-4 absolute left-3 text-gray-400" />
                 <select 
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 hover:bg-gray-50 cursor-pointer appearance-none"
                    value={filterRating || ''}
                    onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : null)}
                 >
                    <option value="">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                 </select>
              </div>
            </div>
          </div>

          <div className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="ml-3 text-gray-600">Loading reviews...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600">{error}</p>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {reviews.length > 0 ? "No reviews match your filters." : "No reviews yet. Waiting for feedback..."}
                </p>
                 {reviews.length > 0 && (
                    <button 
                      onClick={() => { setFilterTag(null); setFilterRating(null); }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
                    >
                      Clear all filters
                    </button>
                  )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/4">
                        Review
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/4">
                        <div className="flex items-center gap-1">
                          AI Summary
                          <span className="text-gray-400 font-normal normal-case ml-1">(Rate Accuracy)</span>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Tags
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredReviews.map((review) => (
                      <tr 
                        key={review.id} 
                        className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                        onClick={() => setSelectedReview(review)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderStars(review.rating)}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900 line-clamp-2 leading-relaxed" title={review.reviewText}>
                            {review.reviewText}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col gap-2">
                            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                              {review.ai_summary}
                            </p>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                              <button 
                                onClick={(e) => handleRateAI(e, review.id, 'up')}
                                className={`p-1 rounded hover:bg-green-100 transition-colors ${aiRatings[review.id] === 'up' ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-green-600'}`}
                                title="Accurate Summary"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => handleRateAI(e, review.id, 'down')}
                                className={`p-1 rounded hover:bg-red-100 transition-colors ${aiRatings[review.id] === 'down' ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-600'}`}
                                title="Inaccurate Summary"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {review.ai_tags?.slice(0, 2).map(tag => (
                              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                            {review.ai_tags?.length > 2 && (
                              <span className="text-xs text-gray-400">+{review.ai_tags.length - 2}</span>
                            )}
                          </div>
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           {formatDate(review.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button 
                            className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-100 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReview(review);
                            }}
                            aria-label="View details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
