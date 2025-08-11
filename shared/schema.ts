import { z } from "zod";

export const searchRequestSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  keywords: z.string().optional(),
  subdomain: z.string().optional(),
  days: z.number().min(1).max(30).optional().default(7),
});

export const paperSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.string(),
  abstract: z.string(),
  arxivUrl: z.string(),
  publishedDate: z.string(),
  categories: z.array(z.string()),
  summary: z.object({
    keyFindings: z.string(),
    methodology: z.string(),
    significance: z.string(),
  }).optional(),
});

export const techcrunchArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  publishedDate: z.string(),
  summary: z.object({
    keyFindings: z.string(),
    methodology: z.string(),
    significance: z.string(),
  }).optional(),
});

export const digestResponseSchema = z.object({
  topic: z.string(),
  papers: z.array(paperSchema),
  techcrunchArticles: z.array(techcrunchArticleSchema),
  generatedDate: z.string(),
  count: z.number(),
  techcrunchCount: z.number(),
  warning: z.string().optional(),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type Paper = z.infer<typeof paperSchema>;
export type TechCrunchArticle = z.infer<typeof techcrunchArticleSchema>;
export type DigestResponse = z.infer<typeof digestResponseSchema>;
