
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { DigestResponse } from '@shared/schema';

export const exportToPDF = (digest: DigestResponse) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('ResearchLens Weekly Digest', 20, 20);
  
  doc.setFontSize(16);
  doc.text(`Topic: ${digest.topic}`, 20, 35);
  
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date(digest.generatedDate).toLocaleDateString()}`, 20, 45);
  doc.text(`${digest.count} ArXiv papers + ${digest.techcrunchCount} TechCrunch articles`, 20, 55);
  
  let yPosition = 70;
  
  // ArXiv Papers Section
  if (digest.papers.length > 0) {
    doc.setFontSize(16);
    doc.text('ArXiv Papers', 20, yPosition);
    yPosition += 15;
    
    const arxivData = digest.papers.map((paper, index) => [
      index + 1,
      paper.title,
      paper.authors,
      paper.summary?.keyFindings || 'No summary available',
      paper.publishedDate
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Title', 'Authors', 'Key Findings', 'Published']],
      body: arxivData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 50 },
        2: { cellWidth: 40 },
        3: { cellWidth: 60 },
        4: { cellWidth: 25 }
      },
      didDrawPage: (data) => {
        yPosition = data.cursor?.y || yPosition + 20;
      }
    });
    
    yPosition += 20;
  }
  
  // TechCrunch Articles Section
  if (digest.techcrunchArticles.length > 0) {
    // Add new page if needed
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(16);
    doc.text('TechCrunch Articles', 20, yPosition);
    yPosition += 15;
    
    const techcrunchData = digest.techcrunchArticles.map((article, index) => [
      index + 1,
      article.title,
      article.summary || 'No summary available',
      new Date(article.publishedAt).toLocaleDateString()
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Title', 'Summary', 'Published']],
      body: techcrunchData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 60 },
        2: { cellWidth: 80 },
        3: { cellWidth: 25 }
      }
    });
  }
  
  // Save the PDF
  doc.save(`ResearchLens_${digest.topic.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToExcel = (digest: DigestResponse) => {
  const workbook = XLSX.utils.book_new();
  
  // ArXiv Papers Sheet
  const arxivData = digest.papers.map((paper, index) => ({
    '#': index + 1,
    Title: paper.title,
    Authors: paper.authors,
    Abstract: paper.abstract,
    'Key Findings': paper.summary?.keyFindings || 'No summary available',
    Methodology: paper.summary?.methodology || 'No summary available',
    Significance: paper.summary?.significance || 'No summary available',
    'Published Date': paper.publishedDate,
    'ArXiv ID': paper.id,
    URL: paper.url
  }));
  
  const arxivSheet = XLSX.utils.json_to_sheet(arxivData);
  XLSX.utils.book_append_sheet(workbook, arxivSheet, 'ArXiv Papers');
  
  // TechCrunch Articles Sheet
  const techcrunchData = digest.techcrunchArticles.map((article, index) => ({
    '#': index + 1,
    Title: article.title,
    Summary: article.summary || 'No summary available',
    'Published Date': new Date(article.publishedAt).toLocaleDateString(),
    URL: article.url
  }));
  
  const techcrunchSheet = XLSX.utils.json_to_sheet(techcrunchData);
  XLSX.utils.book_append_sheet(workbook, techcrunchSheet, 'TechCrunch Articles');
  
  // Save the Excel file
  XLSX.writeFile(workbook, `ResearchLens_${digest.topic.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const generateShareText = (digest: DigestResponse): string => {
  return `📚 Just discovered ${digest.count + digest.techcrunchCount} relevant research papers and articles on "${digest.topic}" using ResearchLens! 🔬✨

ArXiv Papers: ${digest.count}
TechCrunch Articles: ${digest.techcrunchCount}

Stay updated with the latest research! #Research #AI #Technology`;
};

export const shareOnTwitter = (digest: DigestResponse) => {
  const text = encodeURIComponent(generateShareText(digest));
  const url = encodeURIComponent(window.location.href);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
};

export const shareOnLinkedIn = (digest: DigestResponse) => {
  const title = encodeURIComponent(`Weekly Research Digest: ${digest.topic}`);
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
