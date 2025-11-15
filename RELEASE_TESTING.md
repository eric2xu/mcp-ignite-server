# Release Testing Guide

This document outlines the manual testing procedures for validating the mcp-ignite-server before release. Tests can be performed using Claude Desktop, VS Code Copilot, or any MCP client that can call the server tools.

## Prerequisites

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Ensure you have a valid IGNITE_BEARER_TOKEN** in your `.env` file:
   ```bash
   IGNITE_BEARER_TOKEN=your_token_here
   ```

3. **Configure your MCP client** (Claude Desktop or VS Code) with the server

4. **Restart your MCP client** to load the server

## Important: Server Restart Requirement

**You only need to restart the MCP server after running `npm run build`**. This ensures code changes are recompiled and loaded.

The server handles missing cache files gracefully - if a cache file doesn't exist, the server will automatically fetch fresh data from the API, just as it would if the cache had expired. You do NOT need to restart the server when:
- Deleting cache files for testing
- Modifying cache file timestamps
- Testing cache expiration scenarios

If an AI agent is doing the testing, it should pause and ask its human to restart the MCP server only after a build.

---

## Test Phases

### Phase 1: Clean State Testing (No Cache)

Start with fresh cache files. Delete the cache files to simulate a clean install:

```bash
rm data/sessions-cache.json
rm data/speakers-cache.json
```

No server restart is needed - the server will detect missing cache files and fetch fresh data automatically.

#### Test 1.1: get_all_sessions (Fresh Fetch)
- **Action**: Call `get_all_sessions` with no parameters
- **Expected**: Should detect missing cache, fetch from API, and save cache
- **Validate**:
  - Response contains session objects
  - Response includes cache file path confirmation
  - `data/sessions-cache.json` is created with proper structure
  - Response shows sample sessions (first 3)
  - Message says "Successfully fetched and cached X sessions"

**Example Prompt**:
```
Call the get_all_sessions tool to fetch all Ignite sessions.
```

---

#### Test 1.2: get_all_speakers (Fresh Fetch)
- **Action**: Call `get_all_speakers` with no parameters
- **Expected**: Should fetch from API, show all speakers, save cache
- **Validate**:
  - Response contains speaker objects
  - Response includes cache file path confirmation
  - `data/speakers-cache.json` is created with proper structure
  - Response shows sample speakers (first 5)
  - Message states "Successfully fetched X speakers from the API"

**Example Prompt**:
```
Call the get_all_speakers tool to fetch all Ignite speakers.
```

---

### Phase 2: Cached Response Testing

Now test that cached responses work properly without hitting the API.

#### Test 2.1: get_all_sessions (From Cache)
- **Action**: Call `get_all_sessions` with no parameters
- **Expected**: Should return cached data with age information
- **Validate**:
  - Response shows "Retrieved X sessions from cache"
  - Cache age is displayed (should be close to 0 minutes)
  - Shows "Cache expires after 15 minutes"
  - Response includes sample sessions from cache

**Example Prompt**:
```
Fetch all sessions again - this time it should come from cache.
```

---

#### Test 2.2: get_all_speakers (From Cache)
- **Action**: Call `get_all_speakers` with no parameters
- **Expected**: Should return cached data with age information
- **Validate**:
  - Response shows "Loaded X speakers from cache"
  - Cache age is displayed (should be close to 0 minutes)
  - Shows "Cache expires after 60 minutes"
  - Response includes sample speakers from cache

**Example Prompt**:
```
Fetch all speakers again - this time it should come from cache.
```

---

### Phase 3: Force Refresh Testing

Test the `refresh=true` parameter to bypass cache.

#### Test 3.1: get_all_sessions (Force Refresh)
- **Action**: Call `get_all_sessions` with `refresh: true`
- **Expected**: Should fetch from API even if cache exists
- **Validate**:
  - Response shows "Successfully fetched and cached X sessions"
  - Cache file is updated with new timestamp
  - No cache age mentioned (fresh fetch)

**Example Prompt**:
```
Force refresh all sessions by calling get_all_sessions with refresh=true.
```

---

#### Test 3.2: get_all_speakers (Force Refresh)
- **Action**: Call `get_all_speakers` with `refresh: true`
- **Expected**: Should fetch from API even if cache exists
- **Validate**:
  - Response shows "Successfully fetched X speakers from the API"
  - Cache file is updated with new timestamp
  - No cache age mentioned (fresh fetch)

**Example Prompt**:
```
Force refresh all speakers by calling get_all_speakers with refresh=true.
```

---

### Phase 4: Cache Expiration Testing

Test that expired cache triggers a fresh fetch on the next request.

#### Setup: Expire the Sessions Cache

Edit `data/sessions-cache.json` and change the `cachedAt` timestamp to 20+ minutes ago:

```json
{
  "sessions": [...],
  "cachedAt": "2025-11-15T10:00:00.000Z",  // Set to 20+ minutes in the past
  "lastUpdated": "2025-11-15T10:00:00.000Z"
}
```

No server restart is needed - the server checks cache age on each request.

#### Test 4.1: get_all_sessions (Expired Cache Auto-Fetch)
- **Action**: Call `get_all_sessions` with no parameters
- **Expected**: Should detect expired cache and fetch fresh data from API
- **Validate**:
  - Response shows "Successfully fetched and cached X sessions" (NOT from cache)
  - New cache file has updated timestamp
  - Stderr/logs show: "Sessions cache is XX.X minutes old, exceeds max age of 15 minutes"

**Example Prompt**:
```
Fetch all sessions - the cache should be expired and trigger a fresh fetch from the API.
```

---

#### Setup: Expire the Speakers Cache

Edit `data/speakers-cache.json` and change the `cachedAt` timestamp to 65+ minutes ago:

```json
{
  "speakers": [...],
  "cachedAt": "2025-11-15T09:00:00.000Z"  // Set to 65+ minutes in the past
}
```

No server restart is needed - the server checks cache age on each request.

#### Test 4.2: get_all_speakers (Expired Cache Auto-Fetch)
- **Action**: Call `get_all_speakers` with no parameters
- **Expected**: Should detect expired cache and fetch fresh data from API
- **Validate**:
  - Response shows "Successfully fetched X speakers from the API" (NOT from cache)
  - New cache file has updated timestamp
  - Stderr/logs show: "Speakers cache is XX.X minutes old, exceeds max age of 60 minutes"

**Example Prompt**:
```
Fetch all speakers - the cache should be expired and trigger a fresh fetch from the API.
```

---

### Phase 5: Session and Speaker Search Testing

Test search functionality with cached data.

#### Test 5.1: search_sessions
- **Action**: Call `search_sessions` with query parameter
- **Expected**: Should search cached sessions and return matching results
- **Validate**:
  - Returns sessions matching the query
  - Response shows count of matching sessions
  - All returned sessions contain the search term in title, description, or tags

**Example Prompt**:
```
Search for sessions about "AI" using the search_sessions tool.
```

---

#### Test 5.2: search_sessions with filterScheduled
- **Action**: Call `search_sessions` with query and `filterScheduled: true`
- **Expected**: Should filter results to only scheduled sessions
- **Validate**:
  - Only returns sessions with scheduled status
  - Fewer results than without filter
  - All results match the search query

**Example Prompt**:
```
Search for "cloud" sessions that are in my schedule.
```

---

#### Test 5.3: search_sessions with filterFavorites
- **Action**: Call `search_sessions` with query and `filterFavorites: true`
- **Expected**: Should filter results to only favorited sessions
- **Validate**:
  - Only returns favorited sessions
  - All results match the search query

**Example Prompt**:
```
Find all my favorite sessions about "azure".
```

---

#### Test 5.4: search_speakers
- **Action**: Call `search_speakers` with query parameter
- **Expected**: Should search cached speakers and return matching results
- **Validate**:
  - Returns speakers matching the query
  - Response shows count of matching speakers
  - Results only search firstName, lastName, displayName, and company fields

**Example Prompt**:
```
Search for speakers named "John" using the search_speakers tool.
```

---

#### Test 5.5: search_speakers with firstNameOnly
- **Action**: Call `search_speakers` with query and `firstNameOnly: true`
- **Expected**: Should match only in firstName field with word boundary matching
- **Validate**:
  - Returns speakers with exact word match in firstName
  - Fewer results than standard search
  - No partial word matches

**Example Prompt**:
```
Find speakers with the first name "Sarah".
```

---

#### Test 5.6: search_speakers with lastNameOnly
- **Action**: Call `search_speakers` with query and `lastNameOnly: true`
- **Expected**: Should match only in lastName field with word boundary matching
- **Validate**:
  - Returns speakers with exact word match in lastName
  - No partial word matches

**Example Prompt**:
```
Find speakers with the last name "Smith".
```

---

### Phase 6: Schedule and Favorites Testing

Test personal schedule and favorites endpoints.

#### Test 6.1: get_my_schedule
- **Action**: Call `get_my_schedule` with no parameters
- **Expected**: Should return your scheduled sessions
- **Validate**:
  - Returns array of scheduled session objects
  - May be empty if no sessions scheduled
  - Proper response format

**Example Prompt**:
```
Show me my personal Ignite schedule.
```

---

#### Test 6.2: get_favorites
- **Action**: Call `get_favorites` with no parameters
- **Expected**: Should return your favorited sessions and registered labs
- **Validate**:
  - Returns array of favorited session objects
  - May be empty if no favorites
  - Shows count of favorited vs labs

**Example Prompt**:
```
Show me my favorite Ignite sessions.
```

---

### Phase 7: Session Details Testing

Test detailed session information lookup.

#### Test 7.1: get_session_details
- **Action**: Call `get_session_details` with a valid session ID from earlier tests
- **Expected**: Should return details for a specific session ID
- **Validate**:
  - Returns complete session object
  - Includes all session properties (title, description, speakers, etc.)
  - Proper response format

**Example Prompt**:
```
Get details for session ID [INSERT_SESSION_ID_HERE].
```

---

## Error Handling Tests

### Test E.1: Invalid Bearer Token
- **Setup**: Modify `.env` with an invalid token and restart MCP server
- **Expected**: Should show "API request failed: 401"
- **Validate**: Proper error message is returned
- **Note**: Restart is needed because `.env` is loaded at server startup

---

### Test E.2: Search with No Cache
- **Setup**: Delete cache files, try `search_sessions` immediately without calling `get_all_sessions` first
- **Expected**: Should show "No cached sessions available. Please run get_all_sessions first."
- **Validate**: Helpful error message guides user to fetch first
- **Note**: No restart needed - the server handles missing cache files gracefully

---

### Test E.3: Missing Required Parameters
- **Action**: Try calling `search_sessions` without query parameter
- **Expected**: Should return error about missing required parameter

---

## Test Completion Checklist

Use this checklist to track completion of all tests:

### Setup & Prerequisites
- [ ] Project builds successfully (`npm run build`)
- [ ] Valid bearer token is in `.env`
- [ ] MCP client is configured and running

### Phase 1: Clean State Testing
- [ ] Test 1.1: get_all_sessions (Fresh)
- [ ] Test 1.2: get_all_speakers (Fresh)

### Phase 2: Cached Response Testing
- [ ] Test 2.1: get_all_sessions (Cached)
- [ ] Test 2.2: get_all_speakers (Cached)

### Phase 3: Force Refresh Testing
- [ ] Test 3.1: get_all_sessions (Force Refresh)
- [ ] Test 3.2: get_all_speakers (Force Refresh)

### Phase 4: Cache Expiration Testing
- [ ] Edit sessions cache with old timestamp
- [ ] Test 4.1: get_all_sessions (Expired Cache)
- [ ] Edit speakers cache with old timestamp
- [ ] Test 4.2: get_all_speakers (Expired Cache)

### Phase 5: Search Testing
- [ ] Test 5.1: search_sessions
- [ ] Test 5.2: search_sessions (filterScheduled)
- [ ] Test 5.3: search_sessions (filterFavorites)
- [ ] Test 5.4: search_speakers
- [ ] Test 5.5: search_speakers (firstNameOnly)
- [ ] Test 5.6: search_speakers (lastNameOnly)

### Phase 6: Schedule & Favorites Testing
- [ ] Test 6.1: get_my_schedule
- [ ] Test 6.2: get_favorites

### Phase 7: Session Details Testing
- [ ] Test 7.1: get_session_details

### Error Handling Tests
- [ ] Test E.1: Invalid Bearer Token
- [ ] Test E.2: Search with No Cache
- [ ] Test E.3: Missing Required Parameters

---


## Notes

- All tests should be performed with a valid Ignite bearer token
- Cache timestamps can be manually edited in JSON files for expiration testing
- Only restart the MCP server after running `npm run build` (code changes)
- The server handles missing or expired cache files gracefully without needing a restart
- Document any unexpected behavior or errors encountered
- Ensure proper error messages are returned for invalid inputs
