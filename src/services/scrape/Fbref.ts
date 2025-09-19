// src/services/scrape/Fbref.ts

import axios from "axios";

// Type definitions
export interface CellData {
  text: string;
  link?: string;
}

export interface TableData {
  id: string;
  caption: string;
  headers: string[];
  rows: (string | CellData)[][];
}

export interface ScrapedData {
  success: boolean;
  url: string;
  pageTitle: string;
  scraped_at: string;
  tables: TableData[];
  total_tables: number;
}

export interface ScrapeError {
  error: string;
  message?: string;
  retryAfter?: number;
}

export class FBrefScraper {
  private baseApiUrl: string;

  constructor(baseApiUrl: string = '/api') {
    this.baseApiUrl = baseApiUrl;
  }

  /**
   * Scrape data from an FBref URL (existing method)
   */
  async scrapeUrl(url: string): Promise<ScrapedData> {
    if (!url || !url.startsWith('https://fbref.com/')) {
      throw new Error('Invalid FBref URL provided');
    }

    try {
      const response = await fetch(
        `${this.baseApiUrl}/scrape-fbref?url=${encodeURIComponent(url)}`
      );

      const result = await response.json();

      if (!response.ok) {
        const error = result as ScrapeError;
        throw new Error(error.error || 'Failed to scrape data');
      }

      return result as ScrapedData;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred during scraping');
    }
  }

  /**
   * JSON-in-comments scraping (new method)
   */
  async scrapeJsonTables(url: string): Promise<Array<{ headers: string[]; rows: any[][] }> | null> {
    try {
      const { data: html } = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });

      const comments = html.match(/<!--[\s\S]*?-->/g) || [];
      const tables: any[] = [];

      for (const comment of comments) {
        const cleaned = comment.replace(/<!--|-->/g, "").trim();
        if (!cleaned) continue;

        // Try direct JSON parse
        try {
          const parsed = JSON.parse(cleaned);
          if (parsed?.headers && parsed?.rows) {
            tables.push(parsed);
            continue;
          }
        } catch {
          // ignore
        }

        // Sometimes JSON is inside extra text
        const jsonMatch = cleaned.match(/({[\s\S]*}|\[[\s\S]*\])/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed?.headers && parsed?.rows) {
              tables.push(parsed);
            }
          } catch {
            // ignore invalid JSON
          }
        }
      }

      return tables.length ? tables : null;
    } catch (err) {
      return null; // network or 5xx
    }
  }

  /**
   * Get a specific table from scraped data
   */
  getTable(data: ScrapedData, tableId: string): TableData | undefined {
    return data.tables.find((table: TableData) => table.id === tableId);
  }

  /**
   * Get table by caption (partial match)
   */
  getTableByCaption(data: ScrapedData, caption: string): TableData | undefined {
    return data.tables.find((table: TableData) => 
      table.caption.toLowerCase().includes(caption.toLowerCase())
    );
  }

  /**
   * Convert table data to CSV format
   */
  tableToCSV(table: TableData): string {
    const csvContent = [
      table.headers.join(','),
      ...table.rows.map((row: (string | CellData)[]) => 
        row.map((cell: string | CellData) => {
          const cellText = typeof cell === 'object' ? cell.text : cell;
          return `"${cellText.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }

  /**
   * Download table as CSV file
   */
  downloadTableAsCSV(table: TableData, filename?: string): void {
    const csvContent = this.tableToCSV(table);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `fbref-${table.caption.replace(/[^a-zA-Z0-9]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Download all data as JSON file
   */
  downloadAsJSON(data: ScrapedData, filename?: string): void {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `fbref-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Extract player links from a table
   */
  extractPlayerLinks(table: TableData): Array<{ name: string; link: string }> {
    const playerLinks: Array<{ name: string; link: string }> = [];
    
    table.rows.forEach((row: (string | CellData)[]) => {
      row.forEach((cell: string | CellData) => {
        if (typeof cell === 'object' && cell.link && cell.link.includes('/players/')) {
          playerLinks.push({
            name: cell.text,
            link: cell.link
          });
        }
      });
    });

    return playerLinks;
  }

  /**
   * Extract team links from a table
   */
  extractTeamLinks(table: TableData): Array<{ name: string; link: string }> {
    const teamLinks: Array<{ name: string; link: string }> = [];
    
    table.rows.forEach((row: (string | CellData)[]) => {
      row.forEach((cell: string | CellData) => {
        if (typeof cell === 'object' && cell.link && cell.link.includes('/squads/')) {
          teamLinks.push({
            name: cell.text,
            link: cell.link
          });
        }
      });
    });

    return teamLinks;
  }

  /**
   * Get basic statistics about the scraped data
   */
  getDataStats(data: ScrapedData): {
    totalTables: number;
    totalRows: number;
    totalCells: number;
    tablesInfo: Array<{
      caption: string;
      rows: number;
      columns: number;
    }>;
  } {
    let totalRows = 0;
    let totalCells = 0;

    const tablesInfo = data.tables.map((table: TableData) => {
      totalRows += table.rows.length;
      totalCells += table.rows.length * table.headers.length;
      
      return {
        caption: table.caption,
        rows: table.rows.length,
        columns: table.headers.length
      };
    });

    return {
      totalTables: data.tables.length,
      totalRows,
      totalCells,
      tablesInfo
    };
  }
}

// Export a default instance
export const fbrefScraper = new FBrefScraper();

// Export utility functions for direct use
export const scrapeUrl = (url: string): Promise<ScrapedData> => 
  fbrefScraper.scrapeUrl(url);

export const downloadTableAsCSV = (table: TableData, filename?: string): void =>
  fbrefScraper.downloadTableAsCSV(table, filename);

export const downloadAsJSON = (data: ScrapedData, filename?: string): void =>
  fbrefScraper.downloadAsJSON(data, filename);
