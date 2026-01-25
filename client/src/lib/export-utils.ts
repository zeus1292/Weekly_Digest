import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { DigestResponse } from '@shared/schema';

export const exportToPDF = (digest: DigestResponse) => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(20);
  doc.text('Research Lens Report', 20, 20);

  doc.setFontSize(16);
  doc.text(`Topic: ${digest.topic}`, 20, 35);

  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date(digest.generatedAt).toLocaleDateString()}`, 20, 45);
  doc.text(`${digest.papers.count} papers + ${digest.articles.count} articles`, 20, 55);

  let yPosition = 70;

  // Executive Summaries
  doc.setFontSize(14);
  doc.text('Executive Summary - Papers', 20, yPosition);
  yPosition += 10;
  doc.setFontSize(10);
  const paperSummaryLines = doc.splitTextToSize(digest.papers.executiveSummary, 170);
  doc.text(paperSummaryLines, 20, yPosition);
  yPosition += paperSummaryLines.length * 5 + 15;

  doc.setFontSize(14);
  doc.text('Executive Summary - Articles', 20, yPosition);
  yPosition += 10;
  doc.setFontSize(10);
  const articleSummaryLines = doc.splitTextToSize(digest.articles.executiveSummary, 170);
  doc.text(articleSummaryLines, 20, yPosition);
  yPosition += articleSummaryLines.length * 5 + 15;

  // Papers Section
  if (digest.papers.items.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.text('Research Papers', 20, yPosition);
    yPosition += 15;

    const arxivData = digest.papers.items.map((paper, index) => [
      index + 1,
      paper.title.substring(0, 60) + (paper.title.length > 60 ? '...' : ''),
      paper.authors.substring(0, 40) + (paper.authors.length > 40 ? '...' : ''),
      paper.summary.problemStatement.substring(0, 80) + '...',
      new Date(paper.publishedDate).toLocaleDateString()
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Title', 'Authors', 'Problem Statement', 'Published']],
      body: arxivData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 45 },
        2: { cellWidth: 35 },
        3: { cellWidth: 65 },
        4: { cellWidth: 20 }
      },
      didDrawPage: (data) => {
        yPosition = data.cursor?.y || yPosition + 20;
      }
    });

    yPosition += 20;
  }

  // Articles Section
  if (digest.articles.items.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.text('Web Articles', 20, yPosition);
    yPosition += 15;

    const articlesData = digest.articles.items.map((article, index) => [
      index + 1,
      article.title.substring(0, 70) + (article.title.length > 70 ? '...' : ''),
      article.source,
      article.publishedDate ? new Date(article.publishedDate).toLocaleDateString() : 'N/A'
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Title', 'Source', 'Published']],
      body: articlesData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 100 },
        2: { cellWidth: 40 },
        3: { cellWidth: 25 }
      }
    });
  }

  // Save the PDF
  doc.save(`ResearchLens_${digest.topic.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToExcel = (digest: DigestResponse) => {
  const workbook = XLSX.utils.book_new();

  // Papers Sheet
  const papersData = digest.papers.items.map((paper, index) => ({
    '#': index + 1,
    Title: paper.title,
    Authors: paper.authors,
    Abstract: paper.abstract,
    'Problem Statement': paper.summary.problemStatement,
    'Proposed Solution': paper.summary.proposedSolution,
    'Challenges': paper.summary.challenges,
    'Published Date': paper.publishedDate,
    'ArXiv ID': paper.id,
    URL: paper.arxivUrl
  }));

  const papersSheet = XLSX.utils.json_to_sheet(papersData);
  XLSX.utils.book_append_sheet(workbook, papersSheet, 'Research Papers');

  // Articles Sheet
  const articlesData = digest.articles.items.map((article, index) => ({
    '#': index + 1,
    Title: article.title,
    Source: article.source,
    'Published Date': article.publishedDate || 'N/A',
    URL: article.url
  }));

  const articlesSheet = XLSX.utils.json_to_sheet(articlesData);
  XLSX.utils.book_append_sheet(workbook, articlesSheet, 'Web Articles');

  // Summary Sheet
  const summaryData = [
    { Field: 'Topic', Value: digest.topic },
    { Field: 'Timeframe (Days)', Value: digest.timeframeDays },
    { Field: 'Generated At', Value: digest.generatedAt },
    { Field: 'Paper Count', Value: digest.papers.count },
    { Field: 'Article Count', Value: digest.articles.count },
    { Field: 'Papers Executive Summary', Value: digest.papers.executiveSummary },
    { Field: 'Articles Executive Summary', Value: digest.articles.executiveSummary }
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Save the Excel file
  XLSX.writeFile(workbook, `ResearchLens_${digest.topic.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const generateShareText = (digest: DigestResponse): string => {
  return `Research Lens discovered ${digest.papers.count + digest.articles.count} relevant research papers and articles on "${digest.topic}"!

Papers: ${digest.papers.count}
Articles: ${digest.articles.count}

Stay updated with the latest research! #Research #AI #Technology`;
};

export const shareOnTwitter = (digest: DigestResponse) => {
  const text = encodeURIComponent(generateShareText(digest));
  const url = encodeURIComponent(window.location.href);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
};

export const shareOnLinkedIn = (digest: DigestResponse) => {
  const title = encodeURIComponent(`Research Digest: ${digest.topic}`);
  const summary = encodeURIComponent(generateShareText(digest));
  const url = encodeURIComponent(window.location.href);
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`, '_blank');
};

export const shareOnFacebook = (digest: DigestResponse) => {
  const url = encodeURIComponent(window.location.href);
  const quote = encodeURIComponent(generateShareText(digest));
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`, '_blank');
};

export const shareViaEmail = (digest: DigestResponse) => {
  const subject = encodeURIComponent(`Research Digest: ${digest.topic}`);
  const body = encodeURIComponent(`${generateShareText(digest)}\n\nView the full digest: ${window.location.href}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
};

export const copyToClipboard = async (digest: DigestResponse) => {
  const text = `${generateShareText(digest)}\n\nView the full digest: ${window.location.href}`;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};
