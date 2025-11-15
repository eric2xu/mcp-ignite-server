# MCP Ignite Server - Project Summary

## Overview

This is a Model Context Protocol (MCP) server that provides access to Microsoft Ignite conference session data. It allows AI assistants like Claude to help you explore sessions, manage your schedule, and track your favorites.

## What You've Built

### Core Features ✅

1. **Session Management**
   - Fetch all Ignite sessions
   - Cache sessions locally as JSON
   - Search sessions by keywords
   - Get detailed session information

2. **Personal Data**
   - View your schedule
   - View your favorites
   - Filter searches by scheduled/favorited status

3. **Authentication**
   - Bearer token support from ignite.microsoft.com
   - Secure token handling via environment variables

4. **Caching System**
   - Local JSON cache for fast access
   - Manual refresh capability
   - Reduces API calls

### Tools Provided

| Tool | Purpose |
|------|---------|
| `get_all_sessions` | Download and cache all sessions |
| `get_session_details` | Get details for a specific session |
| `search_sessions` | Search by title, description, speaker, or tags |
| `get_my_schedule` | View your scheduled sessions |
| `get_favorites` | View your favorited sessions |

## Project Structure

```
MCP_Ignite/
├── src/
│   └── index.ts           # Main server implementation
├── build/
│   └── index.js           # Compiled JavaScript
├── .vscode/
│   └── mcp.json           # VS Code MCP configuration
├── .env.example           # Template for environment variables
├── .gitignore             # Git ignore rules
├── package.json           # Node.js dependencies
├── tsconfig.json          # TypeScript configuration
├── README.md              # Full documentation
├── QUICKSTART.md          # Quick start guide
├── TESTING.md             # Testing instructions
└── API_RESEARCH.md        # API endpoint discovery notes
```

## Technology Stack

- **Language**: TypeScript/Node.js
- **Framework**: Model Context Protocol SDK (@modelcontextprotocol/sdk)
- **Transport**: STDIO (Standard Input/Output)
- **Dependencies**:
  - `@modelcontextprotocol/sdk` - MCP protocol implementation
  - `node-fetch` - HTTP requests
  - `dotenv` - Environment variable management
  - `zod` - Schema validation

## Getting Started

### Prerequisites
- Node.js 18+
- Bearer token from ignite.microsoft.com

### Quick Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your bearer token
   ```

4. **Test with MCP Inspector**:
   ```bash
   npx @modelcontextprotocol/inspector node build/index.js
   ```

5. **Add to Claude Desktop**:
   Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "ignite": {
         "command": "node",
         "args": ["/path/to/MCP_Ignite/build/index.js"]
       }
     }
   }
   ```

See **QUICKSTART.md** for detailed instructions.

## Important Notes

### ⚠️ API Endpoints

The server uses **assumed** API endpoints that may need adjustment:

- Current base: `https://api-ignite.microsoft.com`
- Endpoints: `/api/sessions`, `/api/session/{id}`, etc.

**If these don't work**, you'll need to:
1. Visit ignite.microsoft.com with DevTools open
2. Capture actual API endpoints from Network tab
3. Update `IGNITE_API_BASE` and `POSSIBLE_ENDPOINTS` in `src/index.ts`
4. Rebuild the project

See **API_RESEARCH.md** for detailed discovery process.

### 🔐 Security

- **Token Storage**: Use `.env` file (never commit to git)
- **Token Scope**: Has access to your Ignite account data
- **Token Expiration**: Will need to be refreshed periodically
- **Read-Only**: Server only reads data, doesn't modify

### 📁 Data Storage

- Cache location: `build/sessions-cache.json`
- Contains: All sessions, schedule status, favorites status
- Format: JSON
- Can be manually inspected or deleted

## Usage Examples

Once configured with Claude:

```
"Get all Ignite sessions"
→ Downloads and caches all sessions

"Search for sessions about AI and machine learning"
→ Returns matching sessions from cache

"Show me my Ignite schedule"
→ Lists all scheduled sessions

"Get details for session ABC123"
→ Shows detailed info for specific session

"Find sessions about Azure that I've favorited"
→ Filtered search results
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Token not set | Create `.env` file with token |
| 401 error | Get fresh token from website |
| 404 error | Update API endpoints (see API_RESEARCH.md) |
| No cache | Run `get_all_sessions` first |

See **TESTING.md** for comprehensive testing guide.

## Development Workflow

1. **Make changes**: Edit `src/index.ts`
2. **Build**: Run `npm run build`
3. **Test**: Use MCP Inspector or test script
4. **Debug**: Check stderr output for errors
5. **Deploy**: Update Claude config and restart

### Development Mode
```bash
npm run dev  # Watch mode for automatic rebuilds
```

## Next Steps

1. ✅ **Test the server** using MCP Inspector
2. ✅ **Discover actual API endpoints** (if default ones don't work)
3. ✅ **Configure with Claude Desktop**
4. ✅ **Start using** - Ask Claude to help with Ignite sessions!

## Future Enhancements

Potential improvements:
- Add support for adding/removing from schedule
- Add support for adding/removing favorites
- Implement session recommendations
- Add calendar export functionality
- Support for session recordings/materials
- Multi-event support (not just Ignite)

## Resources

- **MCP Documentation**: https://modelcontextprotocol.io
- **MCP TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **Microsoft Ignite**: https://ignite.microsoft.com

## Support

For issues or questions:
1. Check the troubleshooting sections in README.md and TESTING.md
2. Review API_RESEARCH.md for endpoint discovery
3. Use MCP Inspector for debugging
4. Check MCP community discussions

## Contributing

If you discover the actual Ignite API endpoints or make improvements:
1. Update the code
2. Document changes in API_RESEARCH.md
3. Update this summary

## License

MIT License - Feel free to modify and distribute

## Disclaimer

This is an unofficial tool, not affiliated with or endorsed by Microsoft. Use responsibly and respect Microsoft's terms of service.

---

**Built with**: Model Context Protocol | **Status**: Ready to use with API endpoint discovery
