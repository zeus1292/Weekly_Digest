import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchForm } from "@/components/search-form";
import { PaperCard } from "@/components/paper-card";
import { TechCrunchCard } from "@/components/techcrunch-card";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { ExportMenu } from "@/components/export-menu";
import { ShareMenu } from "@/components/share-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import type { SearchRequest, DigestResponse } from "@shared/schema";
import { Search, BookOpen, Newspaper } from "lucide-react";

export default function Home() {
  const [searchParams, setSearchParams] = useState<SearchRequest | null>(null);

  const {
    data: digest,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/generate-digest', searchParams],
    queryFn: async () => {
      if (!searchParams) return null;
      
      const endpoint = '/api/generate-digest';
      const response = await apiRequest('POST', endpoint, searchParams);
      return response.json() as Promise<DigestResponse>;
    },
    enabled: !!searchParams,
  });

  const handleSearch = (params: SearchRequest) => {
    setSearchParams(params);
  };

  const handleRetry = () => {
    if (searchParams) {
      refetch();
    }
  };

  const handleNewSearch = () => {
    setSearchParams(null);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Search className="text-white w-4 h-4" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">TechLens</h1>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              {/* <HealthCheck /> */}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Search Section - Show when no search has been made or no results */}
        {!searchParams && (
          <section className="mb-12">
            <div className="max-w-3xl mx-auto text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Stay Current with Technology Trends
              </h2>
              <p className="text-lg text-secondary">
                Generate personalized weekly digests combining the latest research papers from arXiv with cutting-edge industry insights from TechCrunch
              </p>
            </div>
            <SearchForm onSearch={handleSearch} />
          </section>
        )}

        {/* Loading State */}
        {isLoading && <LoadingState />}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState 
            message={error instanceof Error ? error.message : "An error occurred"}
            onRetry={handleRetry}
          />
        )}

        {/* Results Section */}
        {digest && !isLoading && (
          <section>
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  Weekly Digest: <span className="text-primary">{digest.topic}</span>
                </h2>
                <p className="text-secondary mt-1">
                  {digest.count} papers + {digest.techcrunchCount} articles found • Generated on{' '}
                  {new Date(digest.generatedDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="flex items-center space-x-3 ml-6">
                <button 
                  onClick={handleNewSearch}
                  className="px-4 py-2 text-secondary hover:text-gray-900 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 transform hover:scale-105"
                >
                  New Search
                </button>
                <ExportMenu digest={digest} />
                <ShareMenu digest={digest} />
              </div>
            </div>

            {/* Full-width notifications */}
            {(digest as any).warning && (
              <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 rounded-lg shadow-sm">
                <p className="text-sm text-yellow-800 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <strong>Note:</strong> {(digest as any).warning}
                </p>
              </div>
            )}


            {digest.papers.length === 0 && digest.techcrunchArticles.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                <p className="text-secondary mb-4">
                  No recent papers or articles found for "{digest.topic}". Try broadening your search terms or checking a different subdomain.
                </p>
                <button 
                  onClick={handleNewSearch}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Different Search
                </button>
              </div>
            ) : (
              <Tabs defaultValue="arxiv" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="arxiv" className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    ArXiv Papers ({digest.count})
                  </TabsTrigger>
                  <TabsTrigger value="techcrunch" className="flex items-center gap-2">
                    <Newspaper className="w-4 h-4" />
                    TechCrunch ({digest.techcrunchCount})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="arxiv" className="mt-6">
                  {digest.papers.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <BookOpen className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-md font-medium text-gray-900 mb-2">No ArXiv Papers Found</h3>
                      <p className="text-sm text-secondary">
                        No recent papers found for "{digest.topic}" in the selected time frame.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {digest.papers.map((paper, index) => (
                        <PaperCard key={paper.id} paper={paper} />
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="techcrunch" className="mt-6">
                  {digest.techcrunchArticles.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Newspaper className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-md font-medium text-gray-900 mb-2">No TechCrunch Articles Found</h3>
                      <p className="text-sm text-secondary">
                        No recent articles found for "{digest.topic}" in the selected time frame.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {digest.techcrunchArticles.map((article, index) => (
                        <TechCrunchCard key={article.id} article={article} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <Search className="w-3 h-3 text-white" />
                </div>
                <span className="font-semibold text-gray-900">TechLens</span>
              </div>
              <p className="text-sm text-secondary">
                Stay current with technology trends through AI-powered research paper discovery and industry insights.
              </p>
            </div>
            <div className="md:col-span-2"></div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Connect</h4>
              <ul className="space-y-2 text-sm text-secondary">
                <li><a href="https://www.linkedin.com/in/akshaykumar-92/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">LinkedIn</a></li>
                <li><a href="https://akintsugi.carrd.co" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">Website</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-secondary">
            © 2024 TechLens. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
