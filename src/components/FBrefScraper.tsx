// src/components/FBrefScraper.tsx
import React, { useState } from 'react';
import { AlertCircle, Download, Loader2, ExternalLink } from 'lucide-react';

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

const FBrefScraper: React.FC = () => {
  const [data, setData] = useState<ScrapedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState(
    'https://fbref.com/en/comps/9/Premier-League-Stats'
  );

  const scrapeData = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(
        `/api/scrape-fbref?url=${encodeURIComponent(url)}`
      );
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Scraping failed');

      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const downloadAsJson = () => {
    if (!data) return;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fbref-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAsCsv = (tableIndex: number) => {
    if (!data || !data.tables[tableIndex]) return;

    const table = data.tables[tableIndex];
    const csvContent = [
      table.headers.join(','),
      ...table.rows.map((row) =>
        row
          .map((cell) => {
            const cellText = typeof cell === 'object' ? cell.text : cell;
            return `"${cellText.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fbref-${table.caption.replace(/[^a-zA-Z0-9]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          FBref Data Scraper
        </h1>
        <p className="text-gray-600">
          Server-side scraping via Vercel API route
        </p>

        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">✅ Server-Side Implementation:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>No CORS issues — scraping happens on your server</li>
                <li>Rate limiting built-in (10 requests/minute per IP)</li>
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
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://fbref.com/en/comps/9/Premier-League-Stats"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={scrapeData}
            disabled={loading || !url}
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
            <h3 className="font-medium text-gray-900 mb-2">
              Scraped Successfully
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Page:</span> {data.pageTitle}
              </div>
              <div>
                <span className="font-medium">Tables:</span> {data.total_tables}
              </div>
              <div>
                <span className="font-medium">Scraped:</span>{' '}
                {new Date(data.scraped_at).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Data Tables ({data.tables.length})
            </h2>
            <button
              onClick={downloadAsJson}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download All as JSON
            </button>
          </div>

          {data.tables.map((table, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-medium text-gray-900">{table.caption}</h3>
                <div className="flex gap-2 items-center">
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
                      {table.headers.map((header, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {table.rows.slice(0, 10).map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {row.map((cell, cellIndex) => {
                          const content =
                            typeof cell === 'object' && cell.link ? (
                              <a
                                href={cell.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {cell.text} <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              typeof cell === 'object' ? cell.text : cell || '-'
                            );

                          return (
                            <td
                              key={cellIndex}
                              className="px-3 py-2 text-sm text-gray-900 border-r border-gray-200"
                            >
                              {content}
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

export default FBrefScraper;
