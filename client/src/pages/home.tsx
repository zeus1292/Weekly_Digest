import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchForm } from "@/components/search-form";
import { PaperCard } from "@/components/paper-card";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { apiRequest } from "@/lib/queryClient";
import type { SearchRequest, DigestResponse } from "@shared/schema";
import { Search, Share, Download } from "lucide-react";

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
      
      const response = await apiRequest('POST', '/api/generate-digest', searchParams);
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
              <h1 className="text-xl font-semibold text-gray-900">ResearchLens</h1>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <button 
                onClick={handleNewSearch}
                className="text-gray-700 hover:text-primary transition-colors"
              >
                New Search
              </button>
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
                Stay Current with Academic Research
              </h2>
              <p className="text-lg text-secondary">
                Generate personalized weekly digests of the latest research papers from arXiv
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
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Weekly Digest: <span className="text-primary">{digest.topic}</span>
                </h2>
                <p className="text-secondary mt-1">
                  {digest.count} papers found • Generated on{' '}
                  {new Date(digest.generatedDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={handleNewSearch}
                  className="px-4 py-2 text-secondary hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  New Search
                </button>
                <button className="px-4 py-2 text-secondary hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4 mr-2 inline" />
                  Export
                </button>
                <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-emerald-600 transition-colors">
                  <Share className="w-4 h-4 mr-2 inline" />
                  Share
                </button>
              </div>
            </div>

            {digest.papers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Papers Found</h3>
                <p className="text-secondary mb-4">
                  No recent papers found for "{digest.topic}". Try broadening your search terms or checking a different subdomain.
                </p>
                <button 
                  onClick={handleNewSearch}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Different Search
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {digest.papers.map((paper, index) => (
                  <PaperCard key={paper.id} paper={paper} />
                ))}
              </div>
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
                <span className="font-semibold text-gray-900">ResearchLens</span>
              </div>
              <p className="text-sm text-secondary">
                Stay current with academic research through AI-powered paper discovery and summarization.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-secondary">
                <li><a href="#" className="hover:text-gray-900">Features</a></li>
                <li><a href="#" className="hover:text-gray-900">Pricing</a></li>
                <li><a href="#" className="hover:text-gray-900">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-secondary">
                <li><a href="#" className="hover:text-gray-900">Documentation</a></li>
                <li><a href="#" className="hover:text-gray-900">Blog</a></li>
                <li><a href="#" className="hover:text-gray-900">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Connect</h4>
              <ul className="space-y-2 text-sm text-secondary">
                <li><a href="#" className="hover:text-gray-900">Twitter</a></li>
                <li><a href="#" className="hover:text-gray-900">GitHub</a></li>
                <li><a href="#" className="hover:text-gray-900">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-secondary">
            © 2024 ResearchLens. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
