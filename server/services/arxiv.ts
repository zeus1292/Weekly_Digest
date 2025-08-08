import { XMLParser } from 'fast-xml-parser';
import { Paper } from '@shared/schema';

export interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  author: any;
  published: string;
  category: any;
  link: any;
}

export class ArxivService {
  private baseUrl = 'http://export.arxiv.org/api/query';
  private parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });

  async searchPapers(topic: string, keywords?: string, subdomain?: string): Promise<Paper[]> {
    try {
      // Construct search query
      let searchQuery = `all:${topic}`;
      
      if (keywords) {
        const keywordArray = keywords.split(',').map(k => k.trim());
        searchQuery += ` AND (${keywordArray.map(k => `all:${k}`).join(' OR ')})`;
      }

      if (subdomain && subdomain !== "all") {
        searchQuery += ` AND cat:${subdomain}`;
      } else {
        // Default to CS categories
        searchQuery += ` AND (cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR cat:cs.RO OR cat:cs.NE)`;
      }

      // Get papers from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateFilter = sevenDaysAgo.toISOString().split('T')[0].replace(/-/g, '');

      const params = new URLSearchParams({
        search_query: searchQuery,
        start: '0',
        max_results: '50',
        sortBy: 'submittedDate',
        sortOrder: 'descending'
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`ArXiv API error: ${response.status} ${response.statusText}`);
      }

      const xmlData = await response.text();
      const parsed = this.parser.parse(xmlData);
      
      const feed = parsed.feed;
      if (!feed || !feed.entry) {
        return [];
      }

      // Handle both single entry and array of entries
      const entries: ArxivEntry[] = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
      
      // Filter by date and convert to our Paper format
      const papers: Paper[] = entries
        .filter(entry => {
          const publishedDate = new Date(entry.published);
          return publishedDate >= sevenDaysAgo;
        })
        .map(entry => this.convertToPaper(entry))
        .slice(0, 10); // Limit to 10 papers for weekly digest

      return papers;
    } catch (error) {
      console.error('Error fetching from ArXiv:', error);
      throw new Error('Failed to fetch papers from ArXiv');
    }
  }

  private convertToPaper(entry: ArxivEntry): Paper {
    // Handle authors - can be single object or array
    let authors = '';
    if (Array.isArray(entry.author)) {
      authors = entry.author.map(a => a.name).join(', ');
    } else if (entry.author) {
      authors = entry.author.name || 'Unknown';
    }

    // Handle categories
    let categories: string[] = [];
    if (Array.isArray(entry.category)) {
      categories = entry.category.map(c => c["@_term"]);
    } else if (entry.category) {
      categories = [entry.category["@_term"]];
    }

    // Extract arXiv ID from the ID URL
    const arxivId = entry.id.split('/').pop() || entry.id;
    
    return {
      id: arxivId,
      title: entry.title.replace(/\n/g, ' ').trim(),
      authors: authors,
      abstract: entry.summary.replace(/\n/g, ' ').trim(),
      arxivUrl: `https://arxiv.org/abs/${arxivId}`,
      publishedDate: entry.published,
      categories: categories,
    };
  }
}
