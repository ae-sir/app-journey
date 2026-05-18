# Receipt Scanner — Level 2

Upload a photo of any receipt and let Claude AI extract the store name, itemised list, and totals — displayed as a clean, structured card.

## What it does

1. You drag-drop or select a receipt image in the browser
2. The browser sends the image to your local Node.js server
3. The server forwards it (as base64) to the Anthropic Claude API with a vision prompt
4. Claude reads the receipt and returns structured JSON
5. The browser renders it as a formatted table

## Prerequisites

- Node.js 18 or later
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

## Setup

```bash
cd receipt-scanner
npm install
```

Copy the example env file and add your API key:

```bash
cp .env.example .env
# edit .env and paste your ANTHROPIC_API_KEY
```

## Running

```bash
npm start
```

Then open [http://localhost:3001](http://localhost:3001) in your browser.

## Project structure

```
receipt-scanner/
├── server.js          # Express server — handles uploads and calls Claude API
├── package.json
├── .env               # Your API key (never committed to git)
├── .env.example       # Template showing which variables are needed
├── .gitignore         # Excludes .env and node_modules
└── public/
    ├── index.html     # Single-page UI
    ├── css/
    │   └── styles.css # Dark theme matching Level 1
    └── js/
        └── app.js     # File upload, fetch call, and results rendering
```

## Why the API call goes through the server

The Anthropic API requires an API key to authenticate. If the browser called the API directly, the key would be visible in the browser's network tab — anyone could steal it and use your account. The server acts as a secure middleman: it holds the key in a `.env` file, receives the image from the browser, and makes the API call itself. The browser never sees the key.
