# Weather Dashboard

A clean, dark-themed weather dashboard that shows real-time weather data for any city. Built with vanilla HTML, CSS, and JavaScript — no frontend frameworks. Part of the **app-journey** learning project (Level 1).

## What it does

- Search for any city by name
- Displays: city name, country, temperature (°C), weather condition, humidity, and wind speed
- Shows an official weather icon from OpenWeatherMap
- Handles errors gracefully (city not found, network failure, missing API key)

## How the API key is kept safe

This project uses a **server-side proxy** pattern. Instead of calling the OpenWeatherMap API directly from the browser (which would expose your key in the browser's Network tab), the browser calls *our own local server* (`/api/weather`). The server attaches the API key and forwards the request to OpenWeatherMap. The key lives only in `.env` — it never touches the frontend code.

```
Browser  →  localhost:3000/api/weather?city=London  →  server.js  →  OpenWeatherMap API
                                                         (adds API key here, invisibly)
```

## Project structure

```
weather-dashboard/
├── public/               # Everything the browser sees
│   ├── index.html        # Page structure
│   ├── css/
│   │   └── styles.css    # Dark theme styling
│   └── js/
│       └── app.js        # Frontend logic (fetch, render)
├── server.js             # Node.js server (proxy + static file server)
├── package.json          # Project metadata and dependencies
├── .env                  # Your API key — never committed to git
├── .env.example          # Safe template to share with others
├── .gitignore            # Excludes .env and node_modules
└── README.md
```

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher

## Setup

1. **Clone or download the project**

2. **Install dependencies**
   ```bash
   npm install
   ```
   This installs `dotenv`, the only dependency, which reads your `.env` file.

3. **Configure your API key**

   Copy the example env file:
   ```bash
   cp .env.example .env
   ```
   Then open `.env` and replace `your_api_key_here` with your real key from [openweathermap.org](https://openweathermap.org/api).

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser** and go to `http://localhost:3000`

## API used

- [OpenWeatherMap Current Weather API](https://openweathermap.org/current) — free tier, no credit card required
