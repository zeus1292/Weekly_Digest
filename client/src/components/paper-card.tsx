import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Paper } from "@shared/schema";
import { ExternalLink, Bookmark, Eye, Quote, Brain } from "lucide-react";

interface PaperCardProps {
  paper: Paper;
}

export function PaperCard({ paper }: PaperCardProps) {
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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'cs.AI': 'bg-blue-100 text-blue-800',
      'cs.LG': 'bg-green-100 text-green-800',
      'cs.CL': 'bg-purple-100 text-purple-800',
      'cs.CV': 'bg-orange-100 text-orange-800',
      'cs.RO': 'bg-red-100 text-red-800',
      'cs.NE': 'bg-yellow-100 text-yellow-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      'cs.AI': 'AI',
      'cs.LG': 'ML',
      'cs.CL': 'NLP',
      'cs.CV': 'CV',
      'cs.RO': 'Robotics',
      'cs.NE': 'Neural',
    };
    return names[category] || category;
  };

  return (
    <Card className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              <a 
                href={paper.arxivUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                {paper.title}
              </a>
            </h3>
            <p className="text-sm text-secondary mb-3">
              <span>{paper.authors}</span> • 
              <span className="ml-1">{formatDate(paper.publishedDate)}</span> • 
              <a 
                href={paper.arxivUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
              >
                {paper.id}
              </a>
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            {paper.categories.slice(0, 2).map((category) => (
              <Badge 
                key={category}
                className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(category)}`}
                variant="secondary"
              >
                {getCategoryName(category)}
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmark}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <Bookmark 
                className={`w-4 h-4 ${isBookmarked ? 'fill-yellow-400 text-yellow-400' : ''}`} 
              />
            </Button>
          </div>
        </div>

        {paper.summary && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <Brain className="w-4 h-4 text-primary mr-2" />
              AI Summary
            </h4>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Key Findings:</span>
                <p className="text-gray-600 mt-1">{paper.summary.keyFindings}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Methodology:</span>
                <p className="text-gray-600 mt-1">{paper.summary.methodology}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Significance:</span>
                <p className="text-gray-600 mt-1">{paper.summary.significance}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4 text-secondary">
            <Badge variant="secondary" className="px-2 py-1 bg-accent/10 text-accent rounded-full">
              Recent Paper
            </Badge>
          </div>
          <Button
            asChild
            variant="ghost"
            className="text-primary hover:text-blue-700 font-medium"
          >
            <a 
              href={paper.arxivUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read Full Paper <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
