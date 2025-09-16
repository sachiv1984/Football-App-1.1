// src/components/FBrefScraper.tsx
import React, { useState } from 'react';
import { AlertCircle, Download, Loader2, ExternalLink } from 'lucide-react';

// Type definitions
interface CellData {
  text: string;
  link?: string;
}

interface TableData {
  id: string;
  caption: string;
  headers: string[];
  rows: (string | CellData)[][];
}

interface ScrapedData {
  success: boolean;
  url: string;
  pageTitle: string;
  scraped_at: string;
  tables: TableData[];
  total_tables: number;
}

const FBrefScraperVercel: React.FC = () => {
  const [data, setData] = useState<ScrapedData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string>('https://fbref.com/en/comps/9/Premier-League-Stats');
  const [showJson, setShowJson] = useState<boolean>(false);

  const validateUrl = (urlToValidate: string): boolean => {
    try {
      const urlObj = new URL(urlToValidate);
      return urlObj.hostname === 'fbref.com' && urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const scrapeData = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      // Debug: Log the URL being sent
      console.log('Original URL:', url);
      console.log('Encoded URL:', encodeURIComponent(url));
      
      const apiUrl = `/api/scrape-fbref?url=${encodeURIComponent(url)}`;
      console.log('Full API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      const result: ScrapedData | { error: string } = await response.json();
      
      console.log('Response status:', response.status);
      console.log('Response data:', result);
      
      if (!response.ok) {
        throw new Error((result as { error: string }).error || 'Failed to scrape data');
      }
      
      setData(result as ScrapedData);
      
    } catch (err: unknown) {
      console.error('Scraping error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadAsJson = (): void => {
    if (!data) return;
    
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `fbref-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  const viewJson = (): void => {
    if (!data) return;
    
    console.log('FBref Data JSON:', data);
    
    // Optional: Open in new window
    const jsonStr = JSON.stringify(data, null, 2);
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`<pre>${jsonStr}</pre>`);
      newWindow.document.title = 'FBref Data JSON';
    }
  };

  const downloadAsCsv = (tableIndex: number): void => {
    if (!data || !data.tables[tableIndex]) return;
    
    const table = data.tables[tableIndex];
    const csvContent = [
      table.headers.join(','),
      ...table.rows.map((row: (string | CellData)[]) => 
        row.map((cell: string | CellData) => {
          // Handle cell objects with links
          const cellText = typeof cell === 'object' ? cell.text : cell;
          return `"${cellText.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `fbref-${table.caption.replace(/[^a-zA-Z0-9]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">FBref Data Scraper</h1>
        <p className="text-gray-600">Server-side scraping via Vercel API routes</p>
        
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">✅ Server-Side Implementation:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>No CORS issues - scraping happens on your server</li>
                <li>Rate limiting built-in (10 requests per minute per IP)</li>
                <li>Proper headers and error handling</li>
                <li>Extracts links and additional metadata</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          FBref URL to scrape:
        </label>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            placeholder="https://fbref.com/en/comps/9/Premier-League-Stats"
            className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              url && !validateUrl(url) 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300'
            }`}
            disabled={loading}
          />
          <button
            onClick={scrapeData}
            disabled={loading || !url || !validateUrl(url)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scraping...
              </>
            ) : (
              'Scrape Data'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">Error: {error}</p>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Scraped Successfully</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Page:</span> {data.pageTitle}
              </div>
              <div>
                <span className="font-medium">Tables:</span> {data.total_tables}
              </div>
              <div>
                <span className="font-medium">Scraped:</span> {new Date(data.scraped_at).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Data Tables ({data.tables.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowJson(!showJson)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                {showJson ? 'Hide JSON' : 'Show JSON'}
              </button>
              <button
                onClick={viewJson}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View JSON
              </button>
              <button
                onClick={downloadAsJson}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download JSON
              </button>
            </div>
          </div>

          {showJson && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
              <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
            </div>
          )}

          {data.tables.map((table: TableData, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-medium text-gray-900">{table.caption}</h3>
                <div className="flex gap-2">
                  <span className="text-sm text-gray-600">
                    {table.rows.length} rows × {table.headers.length} cols
                  </span>
                  <button
                    onClick={() => downloadAsCsv(index)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    CSV
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {table.headers.map((header: string, headerIndex: number) => (
                        <th key={headerIndex} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {table.rows.slice(0, 10).map((row: (string | CellData)[], rowIndex: number) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {row.map((cell: string | CellData, cellIndex: number) => {
                          const renderCell = () => {
                            if (typeof cell === 'object' && cell !== null && cell.link) {
                              return (
                                <a 
                                  href={cell.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  {cell.text}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              );
                            }
                            
                            const cellText = typeof cell === 'object' && cell !== null ? cell.text : cell;
                            return cellText || '-';
                          };

                          return (
                            <td key={cellIndex} className="px-3 py-2 text-sm text-gray-900 border-r border-gray-200">
                              {renderCell()}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {table.rows.length > 10 && (
                  <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600 text-center border-t border-gray-200">
                    Showing first 10 rows of {table.rows.length} total rows
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FBrefScraperVercel;