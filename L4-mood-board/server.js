require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Ensure /uploads exists at startup (it's gitignored so won't exist on a fresh clone)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// memoryStorage keeps the uploaded file as a Buffer in req.file.buffer
// instead of writing it to disk first. We'll pipe that buffer straight
// to Remove.bg, then only save the *processed* PNG to /uploads.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// ─── GET /api/items ───────────────────────────────────────────────────────────
app.get('/api/items', async (_req, res) => {
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── POST /api/upload ─────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided.' });
  }

  const { item_type, colour, tags } = req.body;
  if (!item_type) {
    return res.status(400).json({ error: 'item_type is required.' });
  }

  // ── Step 1: Send the raw buffer to Remove.bg ─────────────────────────────
  let processedImageBuffer;
  try {
    const form = new FormData();
    // form-data can wrap a raw Buffer directly — no temp file needed
    form.append('image_file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    form.append('size', 'auto');

    const response = await axios.post(
      'https://api.remove.bg/v1.0/removebg',
      form,
      {
        headers: {
          'X-Api-Key': process.env.REMOVE_BG_API_KEY,
          ...form.getHeaders()
        },
        responseType: 'arraybuffer' // get raw bytes back, not a string
      }
    );

    processedImageBuffer = Buffer.from(response.data);
  } catch (err) {
    // Remove.bg returns HTTP error codes we can give the user useful context about
    if (err.response) {
      const status = err.response.status;
      const messages = {
        400: 'Remove.bg could not process the image. Try a clearer photo with a single subject.',
        402: 'Remove.bg API credits are exhausted. Top up your Remove.bg account.',
        403: 'Remove.bg rejected the API key. Double-check REMOVE_BG_API_KEY in your .env file.',
        429: 'Remove.bg rate limit hit. Wait a moment and try again.'
      };
      return res.status(502).json({
        error: messages[status] || `Remove.bg returned error ${status}.`
      });
    }
    return res.status(500).json({ error: `Network error reaching Remove.bg: ${err.message}` });
  }

  // ── Step 2: Save the processed PNG to /uploads ───────────────────────────
  const filename = `item_${randomUUID()}.png`;
  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, processedImageBuffer);

  // ── Step 3: Store metadata in Supabase ───────────────────────────────────
  const tagsArray = tags
    ? tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const { data, error: dbError } = await supabase
    .from('wardrobe_items')
    .insert({ filename, item_type, colour: colour || null, tags: tagsArray })
    .select()
    .single();

  if (dbError) {
    // Rollback the saved file so we don't orphan it
    fs.unlinkSync(filepath);
    return res.status(500).json({ error: `Database error: ${dbError.message}` });
  }

  res.json({ success: true, item: data });
});

// ─── DELETE /api/items/:id ────────────────────────────────────────────────────
app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;

  const { data: item, error: fetchError } = await supabase
    .from('wardrobe_items')
    .select('filename')
    .eq('id', id)
    .single();

  if (fetchError) return res.status(404).json({ error: 'Item not found.' });

  const { error: deleteError } = await supabase
    .from('wardrobe_items')
    .delete()
    .eq('id', id);

  if (deleteError) return res.status(500).json({ error: deleteError.message });

  // Remove the local PNG too
  const filepath = path.join(uploadsDir, item.filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Level 4 — Outfit Mood Board running at http://localhost:${PORT}`);
});
