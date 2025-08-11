import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TechCrunchArticle } from "@shared/schema";
import { ExternalLink, Bookmark, Eye, Quote, Brain } from "lucide-react";

interface TechCrunchCardProps {
  article: TechCrunchArticle;
}

export function TechCrunchCard({ article }: TechCrunchCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300 transform hover:-translate-y-1">
      <CardContent className="p-0">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              <a 
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors hover:underline decoration-2 underline-offset-2"
              >
                {article.title}
              </a>
            </h3>
            <p className="text-sm text-secondary mb-3">
              <span>TechCrunch</span> • 
              <span className="ml-1">{formatDate(article.publishedDate)}</span> • 
              <a 
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
              >
                View Article
              </a>
            </p>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">
                Tech News
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmark}
              className={`p-2 ${isBookmarked ? 'text-yellow-600' : 'text-gray-400'} hover:text-yellow-600`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="p-2 text-gray-400 hover:text-primary"
            >
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>

        {article.summary && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-l-4 border-blue-400">
              <div className="flex items-start gap-3">
                <Quote className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    Key Findings
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {article.summary.keyFindings}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-l-4 border-green-400">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Details</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {article.summary.methodology}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4 border-l-4 border-purple-400">
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Significance</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {article.summary.significance}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}