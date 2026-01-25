import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ExternalLink, Target, Lightbulb, AlertTriangle } from "lucide-react";
import type { PaperSummary } from "@shared/schema";

interface PaperGridProps {
  papers: PaperSummary[];
}

function PaperItem({ paper }: { paper: PaperSummary }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold text-gray-900 leading-snug">
              {paper.title}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">{paper.authors}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {new Date(paper.publishedDate).toLocaleDateString()}
              </Badge>
              {paper.categories.slice(0, 2).map((cat) => (
                <Badge key={cat} variant="secondary" className="text-xs">
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
          <a
            href={paper.arxivUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-2 text-gray-400 hover:text-primary transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <span className="text-sm text-gray-500">
                {isOpen ? "Hide details" : "Show AI summary"}
              </span>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
              <Target className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-red-700 mb-1">Problem Statement</p>
                <p className="text-sm text-gray-700">{paper.summary.problemStatement}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <Lightbulb className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-green-700 mb-1">Proposed Solution</p>
                <p className="text-sm text-gray-700">{paper.summary.proposedSolution}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-700 mb-1">Challenges & Limitations</p>
                <p className="text-sm text-gray-700">{paper.summary.challenges}</p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export function PaperGrid({ papers }: PaperGridProps) {
  if (papers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No papers found for this search.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {papers.map((paper) => (
        <PaperItem key={paper.id} paper={paper} />
      ))}
    </div>
  );
}
