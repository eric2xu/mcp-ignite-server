# Microsoft Ignite MCP Server

A Model Context Protocol (MCP) server that provides access to Microsoft Ignite conference session data, including your personal schedule and favorites.

## Features

This MCP server provides 7 tools to access Microsoft Ignite 2025 data:

### Session Tools
- **get_all_sessions**: Download and cache all 1,033 Ignite sessions (auto-refreshes every 15 minutes)
- **get_session_details**: Retrieve detailed information about a specific session by ID
- **search_sessions**: Find sessions by title, description, speaker, or tags with optional filters
- **get_my_schedule**: View all sessions you've added to your personal schedule (full session objects)
- **get_favorites**: View sessions you've favorited and labs you've registered for

### Speaker Tools
- **get_all_speakers**: Download and cache all 1,579 speakers (auto-refreshes every 60 minutes)
- **search_speakers**: Search speakers by name, company, job title, or biography

### Key Features
- ✅ **Smart Caching**: Automatic cache management with configurable refresh intervals
- ✅ **Real-time Data**: Direct access to Microsoft Ignite API with your authenticated token
- ✅ **Fast Search**: In-memory search across all sessions and speakers
- ✅ **Personal Data**: Access your schedule and favorites with full session details
- ✅ **Production Ready**: Fully tested and working with Claude Desktop

## Prerequisites

- Node.js 18 or higher
- A valid bearer token from ignite.microsoft.com

## Installation

1. Clone this repository or download the files

2. Install dependencies:
```bash
npm install
```

3. Build the server:
```bash
npm run build
```

## Configuration

### Getting Your Bearer Token

To use this server, you need to obtain your bearer token from the Microsoft Ignite website:

1. Go to https://ignite.microsoft.com and sign in
2. Open your browser's Developer Tools (F12)
3. Go to the **Network** tab
4. Browse the Ignite site (view sessions, your schedule, etc.)
5. Look for API calls in the Network tab (filter by XHR/Fetch)
6. Click on an API request and look for the **Authorization** header in the Request Headers
7. Copy the token that comes after "Bearer " (it will be a long string)

### Setting Up Your Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit the `.env` file and add your bearer token:

```
IGNITE_BEARER_TOKEN=your_token_here
```

**Important**: Keep your bearer token secure and never commit it to version control!

## Usage

### With Claude Desktop

Add this server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ignite": {
      "command": "node",
      "args": ["build/index.js"],
      "env": {
        "IGNITE_BEARER_TOKEN": "your_token_here"
      }
    }
  }
}
```

Or use the path to your `.env` file by just pointing to the built server:

```json
{
  "mcpServers": {
    "ignite": {
      "command": "node",
      "args": ["build/index.js"]
    }
  }
}


```

### With Other MCP Clients

Run the server directly:

```bash
node build/index.js
```

## Available Tools

### get_all_sessions

Fetches all Microsoft Ignite sessions and caches them locally.

**Parameters**:
- `refresh` (boolean, optional): Force refresh the cache (default: false)

**Example**:
```
Get all Ignite sessions
```

### get_session_details

Get detailed information about a specific session.

**Parameters**:
- `sessionId` (string, required): The session ID

**Example**:
```
Get details for session ABC123
```

### search_sessions

Search for sessions by keyword.

**Parameters**:
- `query` (string, required): Search query
- `filterScheduled` (boolean, optional): Only show scheduled sessions
- `filterFavorites` (boolean, optional): Only show favorited sessions

**Example**:
```
Search for sessions about "AI" that I've favorited
```

### get_my_schedule

Get all sessions in your personal schedule.

**Example**:
```
Show me my Ignite schedule
```

### get_favorites

Get all your favorited sessions and registered labs.

**Example**:
```
Show me my favorite Ignite sessions
```

### get_all_speakers

Fetches all Microsoft Ignite speakers and caches them locally.

**Parameters**:
- `refresh` (boolean, optional): Force refresh the cache (default: false)

**Example**:
```
Get all Ignite speakers
```

### search_speakers

Search for speakers by name, company, job title, or bio.

**Parameters**:
- `query` (string, required): Search query

**Example**:
```
Search for speakers from Microsoft who work on Azure
```

## Data Storage

### Cache Files

The server maintains two cache files in the `data/` directory:

1. **sessions-cache.json** (~8MB)
   - All 1,033 session objects with complete details
   - Cached timestamp for auto-refresh management
   - Auto-refreshes every 15 minutes
   - Contains: titles, descriptions, speakers, times, locations, tags, etc.

2. **speakers-cache.json** (~2MB)
   - All 1,579 speaker profiles
   - Cached timestamp for auto-refresh management  
   - Auto-refreshes every 60 minutes
   - Contains: names, titles, companies, bios, photos, session lists, etc.

### Cache Benefits
- **Speed**: Instant responses after initial fetch (vs. 2-3 seconds from API)
- **Reliability**: Works offline once data is cached
- **API-Friendly**: Reduces load on Microsoft's servers
- **Smart Updates**: Automatic refresh based on data freshness

You can manually inspect, edit, or delete these cache files. The server will automatically fetch fresh data if cache is missing or stale.

## Important Notes

### API Endpoints (Confirmed Working)

✅ **This server uses the official Microsoft Ignite API endpoints** that have been tested and confirmed working:

- **Base URL**: `https://api-v2.ignite.microsoft.com`
- **Sessions**: `/api/session/all/en-US` (1,033 sessions)
- **Schedule**: `/api/schedule/sessions/en-US` (returns full session objects)
- **Speakers**: `/api/speaker/all/en-US` (1,579 speakers)
- **Favorites**: `/api/favorite/1` and `/api/favorite/4` (returns IDs)

See `API_RESEARCH.md` for complete endpoint documentation and response structures.

### Token Expiration

Bearer tokens typically expire after a certain period. If you start getting authentication errors:
1. Sign in to ignite.microsoft.com again
2. Obtain a fresh bearer token
3. Update your `.env` file

### Privacy & Security

- Your bearer token is personal and should be kept secure
- Never share your token or commit it to public repositories
- The token gives access to your Ignite account data
- This server only reads data; it does not modify your schedule or favorites

## Troubleshooting

### "IGNITE_BEARER_TOKEN is not set"
Make sure you've created a `.env` file with your token, or passed it via environment variables.

### "API request failed: 401"
Your bearer token may have expired or is invalid. Obtain a fresh token from the website.

### "Failed to fetch from Ignite API"
The API endpoints may have changed. Check the error message for clues and inspect network traffic at ignite.microsoft.com to find the correct endpoints.

### "No cached sessions available"
Run the `get_all_sessions` tool first to download and cache the session data.

## Development

### Building
```bash
npm run build
```

### Development Mode (Watch)
```bash
npm run dev
```

### Testing
You can test the server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Contributing

Found the actual API endpoints? Please consider contributing them back to improve this server for everyone!

## License

MIT

## Disclaimer

This is an unofficial tool and is not affiliated with or endorsed by Microsoft. Use at your own risk and respect Microsoft's terms of service.
