#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BEARER_TOKEN = process.env.IGNITE_BEARER_TOKEN;
const CACHE_DIR = path.join(__dirname, "../data");
const CACHE_FILE = path.join(CACHE_DIR, "sessions-cache.json");
const SPEAKERS_CACHE_FILE = path.join(CACHE_DIR, "speakers-cache.json");

// Actual Microsoft Ignite API endpoints (discovered from network traffic)
const IGNITE_API_BASE = "https://api-v2.ignite.microsoft.com";
const POSSIBLE_ENDPOINTS = {
  sessions: "/api/session/all/en-US",
  sessionDetail: "/api/session/{id}/en-US",
  // Schedule endpoint - returns full session objects (preferred!)
  myScheduleSessions: "/api/schedule/sessions/en-US",
  // Speakers endpoint
  speakers: "/api/speaker/all/en-US",
  // Favorite endpoints - return internal IDs only (harder to use)
  // /api/favorite/1 = Favorited/starred sessions (IDs only)
  // /api/favorite/2 = My Schedule (IDs only - use myScheduleSessions instead)
  // /api/favorite/3 = Duplicate of endpoint 2 (appears redundant)
  // /api/favorite/4 = Labs/workshops/registered sessions (IDs only)
  favoritedSessions: "/api/favorite/1",
  myScheduleIds: "/api/favorite/2",
  registeredLabs: "/api/favorite/4",
};

interface Session {
  id: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  speakers?: string[];
  tags?: string[];
  location?: string;
  isScheduled?: boolean;
  isFavorite?: boolean;
  [key: string]: any;
}

interface SessionCache {
  sessions: Session[];
  cachedAt: string;
  lastUpdated: string;
}

class IgniteMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "mcp-ignite-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async makeIgniteRequest(endpoint: string, method: string = "GET"): Promise<any> {
    if (!BEARER_TOKEN) {
      throw new Error("IGNITE_BEARER_TOKEN is not set in environment variables");
    }

    const url = `${IGNITE_API_BASE}${endpoint}`;
    
    // Remove "Bearer " prefix if it's already in the token
    const token = BEARER_TOKEN.startsWith("Bearer ") ? BEARER_TOKEN.substring(7) : BEARER_TOKEN;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "Origin": "https://ignite.microsoft.com",
          "Referer": "https://ignite.microsoft.com/",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Failed to fetch from Ignite API: ${error.message}`);
    }
  }

  private async loadCache(maxAgeMinutes: number = 15): Promise<SessionCache | null> {
    try {
      const data = await fs.readFile(CACHE_FILE, "utf-8");
      const cache = JSON.parse(data);
      
      // Check if cache is still valid
      const cachedTime = new Date(cache.cachedAt).getTime();
      const now = Date.now();
      const ageMinutes = (now - cachedTime) / (1000 * 60);
      
      if (ageMinutes > maxAgeMinutes) {
        console.error(`Sessions cache is ${ageMinutes.toFixed(1)} minutes old, exceeds max age of ${maxAgeMinutes} minutes`);
        return null;
      }
      
      return cache;
    } catch (error) {
      return null;
    }
  }

  private async saveCache(cache: SessionCache): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
    } catch (error: any) {
      console.error(`Failed to save cache: ${error.message}`);
    }
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_all_sessions",
            description: "Fetch all Microsoft Ignite sessions with automatic caching. Cache auto-refreshes every 15 minutes. Use refresh=true to force immediate refresh.",
            inputSchema: {
              type: "object",
              properties: {
                refresh: {
                  type: "boolean",
                  description: "Force refresh the cache from the API, bypassing the 15-minute auto-refresh (default: false)",
                  default: false,
                },
              },
            },
          },
          {
            name: "get_session_details",
            description: "Get detailed information about a specific Ignite session by its ID",
            inputSchema: {
              type: "object",
              properties: {
                sessionId: {
                  type: "string",
                  description: "The unique identifier for the session",
                },
              },
              required: ["sessionId"],
            },
          },
          {
            name: "search_sessions",
            description: "Search sessions by title, description, speaker, or tags",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query string",
                },
                filterScheduled: {
                  type: "boolean",
                  description: "Only show sessions in your schedule",
                  default: false,
                },
                filterFavorites: {
                  type: "boolean",
                  description: "Only show favorited sessions",
                  default: false,
                },
              },
              required: ["query"],
            },
          },
          {
            name: "get_my_schedule",
            description: "Get all sessions that you have added to your personal schedule",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "get_favorites",
            description: "Get all sessions that you have marked as favorites",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "get_all_speakers",
            description: "Fetch all Microsoft Ignite speakers with automatic caching. Cache auto-refreshes every 60 minutes. Use refresh=true to force immediate refresh.",
            inputSchema: {
              type: "object",
              properties: {
                refresh: {
                  type: "boolean",
                  description: "Force refresh the cache from the API, bypassing the 60-minute auto-refresh (default: false)",
                  default: false,
                },
              },
            },
          },
          {
            name: "search_speakers",
            description: "Search speakers by name, company, job title, or bio",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query string",
                },
              },
              required: ["query"],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_all_sessions":
            return await this.handleGetAllSessions(args);
          case "get_session_details":
            return await this.handleGetSessionDetails(args);
          case "search_sessions":
            return await this.handleSearchSessions(args);
          case "get_my_schedule":
            return await this.handleGetMySchedule();
          case "get_favorites":
            return await this.handleGetFavorites();
          case "get_all_speakers":
            return await this.handleGetAllSpeakers(args);
          case "search_speakers":
            return await this.handleSearchSpeakers(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleGetAllSessions(args: any) {
    const refresh = args?.refresh || false;

    try {
      // Check cache first (auto-refresh after 15 minutes unless force refresh)
      if (!refresh) {
        const cache = await this.loadCache(15); // 15 minute cache
        if (cache) {
          const ageMinutes = (Date.now() - new Date(cache.cachedAt).getTime()) / (1000 * 60);
          return {
            content: [
              {
                type: "text",
                text: `Retrieved ${cache.sessions.length} sessions from cache (cached ${ageMinutes.toFixed(1)} minutes ago).\n\n` +
                      `Cache auto-refreshes after 15 minutes. Use refresh=true to force refresh now.\n\n` +
                      `Cache file: ${CACHE_FILE}\n\n` +
                      `Sample sessions:\n${JSON.stringify(cache.sessions.slice(0, 3), null, 2)}`,
              },
            ],
          };
        }
        // Cache is stale or doesn't exist, fetch fresh data
      }

      // Fetch from API
      const data = await this.makeIgniteRequest(POSSIBLE_ENDPOINTS.sessions);
      const sessions: Session[] = Array.isArray(data) ? data : data.sessions || data.value || [];

      const cache: SessionCache = {
        sessions,
        cachedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      await this.saveCache(cache);

      return {
        content: [
          {
            type: "text",
            text: `Successfully fetched and cached ${sessions.length} sessions.\n\n` +
                  `Cache saved to: ${CACHE_FILE}\n\n` +
                  JSON.stringify(sessions, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch sessions from API.\n\n` +
                  `Error: ${error.message}\n\n` +
                  `IMPORTANT: You may need to:\n` +
                  `1. Verify your IGNITE_BEARER_TOKEN is valid\n` +
                  `2. Check the actual API endpoint by inspecting network traffic at ignite.microsoft.com\n` +
                  `3. Update the IGNITE_API_BASE and endpoint paths in the server code\n\n` +
                  `Current configuration:\n` +
                  `- Base URL: ${IGNITE_API_BASE}\n` +
                  `- Endpoint: ${POSSIBLE_ENDPOINTS.sessions}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetSessionDetails(args: any) {
    const sessionId = args.sessionId;

    if (!sessionId) {
      throw new Error("sessionId is required");
    }

    try {
      // Try to get from cache first
      const cache = await this.loadCache();
      if (cache) {
        const session = cache.sessions.find((s) => s.id === sessionId);
        if (session) {
          return {
            content: [
              {
                type: "text",
                text: `Session details (from cache):\n\n${JSON.stringify(session, null, 2)}`,
              },
            ],
          };
        }
      }

      // Fetch from API
      const endpoint = POSSIBLE_ENDPOINTS.sessionDetail.replace("{id}", sessionId);
      const session = await this.makeIgniteRequest(endpoint);

      return {
        content: [
          {
            type: "text",
            text: `Session details:\n\n${JSON.stringify(session, null, 2)}`,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get session details: ${error.message}`);
    }
  }

  private async handleSearchSessions(args: any) {
    const { query, filterScheduled, filterFavorites } = args;

    const cache = await this.loadCache();
    if (!cache) {
      throw new Error("No cached sessions available. Please run get_all_sessions first.");
    }

    const queryLower = query.toLowerCase();
    let results = cache.sessions.filter((session) => {
      const matchesQuery =
        session.title?.toLowerCase().includes(queryLower) ||
        session.description?.toLowerCase().includes(queryLower) ||
        session.speakers?.some((s) => s.toLowerCase().includes(queryLower)) ||
        session.tags?.some((t) => t.toLowerCase().includes(queryLower));

      const matchesScheduled = !filterScheduled || session.isScheduled;
      const matchesFavorites = !filterFavorites || session.isFavorite;

      return matchesQuery && matchesScheduled && matchesFavorites;
    });

    return {
      content: [
        {
          type: "text",
          text: `Found ${results.length} matching sessions:\n\n${JSON.stringify(results, null, 2)}`,
        },
      ],
    };
  }

  private async handleGetMySchedule() {
    try {
      // Use the schedule/sessions endpoint which returns full session objects!
      const scheduledSessions = await this.makeIgniteRequest(POSSIBLE_ENDPOINTS.myScheduleSessions);
      
      if (!Array.isArray(scheduledSessions) || scheduledSessions.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "Your schedule is empty.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Your schedule (${scheduledSessions.length} sessions):\n\n${JSON.stringify(scheduledSessions, null, 2)}`,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get schedule: ${error.message}`);
    }
  }

  private async handleGetFavorites() {
    try {
      // Fetch favorite IDs from API
      // Endpoint 1 = Favorited/starred sessions
      // Endpoint 4 = Labs/workshops/registered sessions
      const favoritedIds = await this.makeIgniteRequest(POSSIBLE_ENDPOINTS.favoritedSessions);
      const labIds = await this.makeIgniteRequest(POSSIBLE_ENDPOINTS.registeredLabs);
      
      const allFavoriteIds = [...favoritedIds, ...labIds];
      
      if (allFavoriteIds.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "You have no favorited sessions or registered labs.",
            },
          ],
        };
      }

      // Note: Similar to schedule, these IDs are internal record IDs
      const cache = await this.loadCache();
      if (cache) {
        const matchedSessions = cache.sessions.filter(session => {
          const sessionStr = JSON.stringify(session);
          return allFavoriteIds.some(id => sessionStr.includes(id));
        });

        if (matchedSessions.length > 0) {
          return {
            content: [
              {
                type: "text",
                text: `Your favorites (${matchedSessions.length} sessions matched from ${allFavoriteIds.length} favorite items):\n\nFavorited: ${favoritedIds.length}\nLabs: ${labIds.length}\n\n${JSON.stringify(matchedSessions, null, 2)}`,
              },
            ],
          };
        }
      }

      return {
        content: [
          {
            type: "text",
            text: `Found ${allFavoriteIds.length} favorite items (${favoritedIds.length} favorited, ${labIds.length} labs), but could not match them to session details.\n\nFavorite IDs:\n${JSON.stringify(allFavoriteIds, null, 2)}\n\nNote: These IDs are internal record IDs. You may need to check browser network traffic to understand how they map to actual sessions.`,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get favorites: ${error.message}`);
    }
  }

  private async loadSpeakersCache(maxAgeMinutes: number = 60): Promise<{ speakers: any[]; cachedAt: string } | null> {
    try {
      const data = await fs.readFile(SPEAKERS_CACHE_FILE, "utf-8");
      const cache = JSON.parse(data);
      
      // Check if cache is still valid
      const cachedTime = new Date(cache.cachedAt).getTime();
      const now = Date.now();
      const ageMinutes = (now - cachedTime) / (1000 * 60);
      
      if (ageMinutes > maxAgeMinutes) {
        console.error(`Speakers cache is ${ageMinutes.toFixed(1)} minutes old, exceeds max age of ${maxAgeMinutes} minutes`);
        return null;
      }
      
      return cache;
    } catch (error) {
      return null;
    }
  }

  private async saveSpeakersCache(cache: { speakers: any[]; cachedAt: string }): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(SPEAKERS_CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
    } catch (error: any) {
      throw new Error(`Failed to save speakers cache: ${error.message}`);
    }
  }

  private async handleGetAllSpeakers(args: any) {
    const { refresh = false } = args;

    try {
      // Check cache first (auto-refresh after 60 minutes unless force refresh)
      if (!refresh) {
        const cache = await this.loadSpeakersCache(60); // 60 minute cache
        if (cache) {
          const ageMinutes = (Date.now() - new Date(cache.cachedAt).getTime()) / (1000 * 60);
          return {
            content: [
              {
                type: "text",
                text:
                  `Loaded ${cache.speakers.length} speakers from cache (cached ${ageMinutes.toFixed(1)} minutes ago).\n\n` +
                  `Cache auto-refreshes after 60 minutes. Use refresh=true to force refresh now.\n\n` +
                  `Cache file: ${SPEAKERS_CACHE_FILE}\n\n` +
                  `Sample speakers:\n${JSON.stringify(cache.speakers.slice(0, 5), null, 2)}`,
              },
            ],
          };
        }
        // Cache is stale or doesn't exist, fetch fresh data
      }

      // Fetch from API
      const speakers = await this.makeIgniteRequest(POSSIBLE_ENDPOINTS.speakers);

      if (!Array.isArray(speakers)) {
        throw new Error("Invalid response from speakers API");
      }

      // Save to cache
      const cache = {
        speakers,
        cachedAt: new Date().toISOString(),
      };
      await this.saveSpeakersCache(cache);

      return {
        content: [
          {
            type: "text",
            text:
              `Successfully fetched ${speakers.length} speakers from the API.\n\n` +
              `Cache saved to: ${SPEAKERS_CACHE_FILE}\n\n` +
              `Cache will auto-refresh after 60 minutes.\n\n` +
              `Sample speakers:\n${JSON.stringify(speakers.slice(0, 5), null, 2)}`,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get speakers: ${error.message}`);
    }
  }

  private async handleSearchSpeakers(args: any) {
    const { query } = args;

    const cache = await this.loadSpeakersCache();
    if (!cache) {
      throw new Error("No cached speakers available. Please run get_all_speakers first.");
    }

    const queryLower = query.toLowerCase();
    const results = cache.speakers.filter((speaker) => {
      return (
        speaker.displayName?.toLowerCase().includes(queryLower) ||
        speaker.firstName?.toLowerCase().includes(queryLower) ||
        speaker.lastName?.toLowerCase().includes(queryLower) ||
        speaker.company?.toLowerCase().includes(queryLower) ||
        speaker.jobTitle?.toLowerCase().includes(queryLower) ||
        speaker.bio?.toLowerCase().includes(queryLower)
      );
    });

    return {
      content: [
        {
          type: "text",
          text: `Found ${results.length} matching speakers:\n\n${JSON.stringify(results, null, 2)}`,
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Server running - silent startup for clean logs
  }
}

const server = new IgniteMCPServer();
server.run().catch(console.error);
