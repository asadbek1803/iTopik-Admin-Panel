const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

// Proxy /api requests to https://itopik.uz
app.use('/api', createProxyMiddleware({
    target: 'https://itopik.uz',
    changeOrigin: true,
    onProxyRes: function (proxyRes, req, res) {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    }
}));

// Serve static files from the current directory
app.use(express.static(path.join(__dirname, '')));

// Fallback for missing pages, send to index.html
app.get('*', (req, res) => {
    // If it's a request for an API that wasn't caught, or a missing file, send index.html
    // But exclude .html requests to avoid infinite loops if an html file doesn't exist
    if (req.path.endsWith('.html')) {
        res.status(404).send('Not found');
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Proxying /api requests to https://itopik.uz`);
});
