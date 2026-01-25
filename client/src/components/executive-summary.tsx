import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Newspaper, Sparkles } from "lucide-react";

interface ExecutiveSummaryProps {
  title: string;
  summary: string;
  type: "papers" | "articles";
  count: number;
}

export function ExecutiveSummary({ title, summary, type, count }: ExecutiveSummaryProps) {
  const Icon = type === "papers" ? BookOpen : Newspaper;
  const gradientClass = type === "papers"
    ? "from-blue-50 to-indigo-50 border-blue-200"
    : "from-emerald-50 to-teal-50 border-emerald-200";
  const iconBgClass = type === "papers" ? "bg-blue-100" : "bg-emerald-100";
  const iconColor = type === "papers" ? "text-blue-600" : "text-emerald-600";

  return (
    <Card className={`bg-gradient-to-br ${gradientClass} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className={`p-2 rounded-lg ${iconBgClass}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <span className="text-gray-900">{title}</span>
            <span className="ml-2 text-sm font-normal text-gray-500">({count} found)</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0" />
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{summary}</p>
        </div>
      </CardContent>
    </Card>
  );
}
