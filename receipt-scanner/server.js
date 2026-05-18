require('dotenv').config();

const express = require('express');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.ANTHROPIC_API_KEY;

const app = express();

// multer keeps the uploaded file in memory as a Buffer — no disk writes needed
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
    }
  },
});

const client = new Anthropic({ apiKey: API_KEY });

// Serve everything in public/ as static files
app.use(express.static(path.join(__dirname, 'public')));

// Receipt scanning endpoint — receives image, calls Claude, returns structured JSON
app.post('/api/scan-receipt', upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file received' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured — check your .env file' });
  }

  const base64Image = req.file.buffer.toString('base64');
  const mediaType = req.file.mimetype;

  const PROMPT = `Extract all data from this receipt image and return it as JSON only.
No explanation, no markdown, just valid JSON matching this exact shape:
{
  "store": "store or restaurant name",
  "date": "date shown on receipt, or null",
  "items": [
    { "name": "item description", "price": "4.99" }
  ],
  "subtotal": "amount before tax, or null",
  "tax": "tax amount, or null",
  "total": "final total"
}
Prices should be strings like "4.99" (no currency symbol). If you cannot read a value, use null.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Image },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });

    const raw = message.content[0].text.trim();
    // Strip any markdown code fences Claude might wrap around the JSON
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const data = JSON.parse(jsonText);
    res.json(data);
  } catch (err) {
    console.error('Receipt scan error:', err);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'Could not parse receipt — try a clearer photo' });
    }
    res.status(502).json({ error: 'Anthropic API error: ' + err.message });
  }
});

// Multer error handler (file too large, wrong type, etc.)
app.use((err, req, res, next) => {
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Receipt Scanner running at http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn('Warning: ANTHROPIC_API_KEY is not set in your .env file');
  }
});
