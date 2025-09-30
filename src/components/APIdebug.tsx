// Updated fetchOdds function for APIdebug.tsx
// Replace your existing fetchOdds function with this:

const fetchOdds = async () => {
  setLoading(true);
  setError(null);
  setRawResponse(null);
  addLog(`🔍 Fetching odds for ${homeTeam} vs ${awayTeam}...`, 'info');

  try {
    const apiUrl = `/api/odds?home=${encodeURIComponent(homeTeam)}&away=${encodeURIComponent(awayTeam)}`;
    addLog(`📡 Calling: ${apiUrl}`, 'info');
    
    const response = await fetch(apiUrl);
    addLog(`📨 Response status: ${response.status} ${response.statusText}`, 'info');
    addLog(`📨 Content-Type: ${response.headers.get('content-type')}`, 'info');
    
    // Get response as text first to check what we received
    const text = await response.text();
    addLog(`📨 Response length: ${text.length} characters`, 'info');
    
    // Check if it's HTML (error page)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      const errorMsg = 'Received HTML instead of JSON - API endpoint not found or misconfigured';
      setError(errorMsg);
      addLog(`❌ ${errorMsg}`, 'error');
      addLog(`📄 Response preview: ${text.slice(0, 200)}`, 'error');
      
      // Show the HTML in raw response for debugging
      setRawResponse({ 
        error: 'HTML Response', 
        preview: text.slice(0, 500),
        suggestion: 'Check that api/odds.cjs exists and is properly configured'
      });
      return;
    }

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      setError(`Invalid JSON response: ${parseErr.message}`);
      addLog(`❌ JSON Parse Error: ${parseErr.message}`, 'error');
      addLog(`📄 Response: ${text.slice(0, 200)}`, 'error');
      setRawResponse({ error: 'Parse Error', text: text.slice(0, 500) });
      return;
    }

    if (!response.ok) {
      setError(data.error || 'Unknown error');
      addLog(`❌ ${data.error || 'Failed to fetch odds'}`, 'error');
      setRawResponse(data);
    } else {
      setOddsData(data);
      setRawResponse(data);
      addLog('✅ Odds fetched successfully', 'success');
      
      // Log what markets we got
      const markets = [];
      if (data.totalGoalsOdds) markets.push('Goals');
      if (data.bttsOdds) markets.push('BTTS');
      if (data.totalCardsOdds) markets.push('Cards');
      if (data.totalCornersOdds) markets.push('Corners');
      if (data.mostCardsOdds) markets.push('Most Cards');
      
      addLog(`📊 Markets found: ${markets.join(', ') || 'None'}`, 'success');
      updateCacheStatus(data);
    }
  } catch (err: any) {
    const errorMsg = err.message || 'Network error';
    setError(errorMsg);
    addLog(`❌ Error: ${errorMsg}`, 'error');
    
    if (err.stack) {
      addLog(`📚 Stack: ${err.stack.split('\n')[0]}`, 'error');
    }
  } finally {
    setLoading(false);
  }
};
