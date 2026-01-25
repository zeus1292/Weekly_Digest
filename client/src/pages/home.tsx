import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SearchForm } from "@/components/search-form";
import { ExecutiveSummary } from "@/components/executive-summary";
import { PaperGrid } from "@/components/paper-grid";
import { ArticleGrid } from "@/components/article-grid";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import type { SearchRequest, DigestResponse } from "@shared/schema";
import { Search, BookOpen, Newspaper, User, LogOut, History, ChevronDown } from "lucide-react";

export default function Home() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useState<SearchRequest | null>(null);

  const {
    data: digest,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/research', searchParams],
    queryFn: async () => {
      if (!searchParams) return null;

      const response = await apiRequest('POST', '/api/research', searchParams);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Search className="text-white w-4 h-4" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Research Lens</h1>
            </Link>
            <nav className="flex items-center space-x-4">
              {!authLoading && (
                user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="hidden sm:inline">{user.email}</span>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href="/history" className="flex items-center">
                          <History className="w-4 h-4 mr-2" />
                          Search History
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout} className="text-red-600">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link href="/history">
                      <Button variant="ghost" size="sm">
                        <History className="w-4 h-4 mr-2" />
                        History
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button variant="outline" size="sm">Sign In</Button>
                    </Link>
                    <Link href="/register">
                      <Button size="sm">Sign Up</Button>
                    </Link>
                  </div>
                )
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Search Section */}
        {!searchParams && (
          <section className="mb-12">
            <div className="max-w-3xl mx-auto text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                AI-Powered Research Discovery
              </h2>
              <p className="text-lg text-gray-600">
                Combine the latest academic papers from ArXiv with real-time web articles,
                summarized by AI for actionable insights.
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
                  Research Results: <span className="text-primary">{digest.topic}</span>
                </h2>
                <p className="text-gray-600 mt-1">
                  {digest.papers.count} papers + {digest.articles.count} articles •
                  Last {digest.timeframeDays} days •
                  Generated {new Date(digest.generatedAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                onClick={handleNewSearch}
                variant="outline"
              >
                New Search
              </Button>
            </div>

            {/* Warning Banner */}
            {digest.warning && (
              <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                <p className="text-sm text-yellow-800 flex items-center">
                  <strong className="mr-1">Note:</strong> {digest.warning}
                </p>
              </div>
            )}

            {/* Executive Summaries */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <ExecutiveSummary
                title="Research Papers"
                summary={digest.papers.executiveSummary}
                type="papers"
                count={digest.papers.count}
              />
              <ExecutiveSummary
                title="Web Articles"
                summary={digest.articles.executiveSummary}
                type="articles"
                count={digest.articles.count}
              />
            </div>

            {/* Content Tabs */}
            {(digest.papers.count > 0 || digest.articles.count > 0) && (
              <Tabs defaultValue="papers" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="papers" className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Papers ({digest.papers.count})
                  </TabsTrigger>
                  <TabsTrigger value="articles" className="flex items-center gap-2">
                    <Newspaper className="w-4 h-4" />
                    Articles ({digest.articles.count})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="papers">
                  <PaperGrid papers={digest.papers.items} />
                </TabsContent>

                <TabsContent value="articles">
                  <ArticleGrid articles={digest.articles.items} />
                </TabsContent>
              </Tabs>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Search className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Research Lens</span>
            </div>
            <p className="text-sm text-gray-500">
              AI-powered research aggregation combining ArXiv papers and web articles.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
