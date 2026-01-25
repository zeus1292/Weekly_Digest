import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, History, Trash2, BookOpen, Newspaper, Clock, ArrowLeft } from "lucide-react";
import type { HistoryItem } from "@shared/schema";

export default function HistoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/history"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/history");
      const data = await response.json();
      return data.items as HistoryItem[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Search className="text-white w-4 h-4" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Research Lens</h1>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <History className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-gray-900">Search History</h2>
            </div>
          </div>
          {user && (
            <Badge variant="outline" className="text-sm">
              Signed in as {user.email}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center text-red-500">
              Failed to load history. Please try again.
            </CardContent>
          </Card>
        ) : !data || data.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No search history</h3>
              <p className="text-gray-500 mb-4">
                Your research searches will appear here.
              </p>
              <Link href="/">
                <Button>
                  <Search className="w-4 h-4 mr-2" />
                  Start Researching
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">
                        {item.topic}
                      </h3>
                      {item.keywords && (
                        <p className="text-sm text-gray-500 mb-2">
                          Keywords: {item.keywords}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{item.paperCount ?? 0} papers</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Newspaper className="w-4 h-4" />
                          <span>{item.articleCount ?? 0} articles</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{item.timeframeDays} days</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(item.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
