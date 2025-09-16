// Create this file at: api/test.js (for Vercel) or pages/api/test.js (for Next.js)

export default async function handler(req, res) {
  console.log('Test API endpoint hit!');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  
  return res.status(200).json({
    success: true,
    message: "API route is working!",
    timestamp: new Date().toISOString(),
    query: req.query
  });
}
