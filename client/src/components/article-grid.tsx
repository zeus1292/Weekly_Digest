import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Globe } from "lucide-react";

interface ArticleItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedDate?: string;
}

interface ArticleGridProps {
  articles: ArticleItem[];
}

function ArticleCard({ article }: { article: ArticleItem }) {
  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-primary/10 transition-colors">
            <Globe className="w-4 h-4 text-gray-500 group-hover:text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors line-clamp-2">
                {article.title}
              </h3>
            </a>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {article.source}
              </Badge>
              {article.publishedDate && (
                <span className="text-xs text-gray-500">
                  {new Date(article.publishedDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-primary transition-colors flex-shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export function ArticleGrid({ articles }: ArticleGridProps) {
  if (articles.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No articles found for this search.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
