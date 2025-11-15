# API Endpoint Research Notes

This document tracks the **confirmed working** API endpoints used by ignite.microsoft.com.

## How to Find the Endpoints

1. Visit https://ignite.microsoft.com
2. Open DevTools (F12) → Network tab
3. Filter by XHR or Fetch
4. Interact with the site (browse sessions, view your schedule, etc.)
5. Document the API calls you see below

## Discovered Endpoints (CONFIRMED WORKING)

### Base URL
```
https://api-v2.ignite.microsoft.com
```

### Sessions List ✅
- **Endpoint**: `/api/session/all/en-US`
- **Method**: GET
- **Full URL**: `https://api-v2.ignite.microsoft.com/api/session/all/en-US`
- **Headers**: 
  - `Authorization: Bearer {token}`
  - `Accept: application/json, text/plain, */*`
  - `Content-Type: application/json`
  - `Origin: https://ignite.microsoft.com`
  - `Referer: https://ignite.microsoft.com/`
- **Response**: Array of session objects (1,033 sessions as of Nov 2025)
- **Cache Strategy**: 15-minute auto-refresh

### Single Session Details ✅
- **Endpoint**: `/api/session/{sessionId}/en-US`
- **Method**: GET
- **Example**: `/api/session/62a4e3c2-3048-42ea-b08b-f2d640ebf427/en-US`
- **Headers**: Same as Sessions List
- **Response**: Single session object with full details

### My Schedule (Full Session Objects) ✅
- **Endpoint**: `/api/schedule/sessions/en-US`
- **Method**: GET
- **Full URL**: `https://api-v2.ignite.microsoft.com/api/schedule/sessions/en-US`
- **Headers**: Same as Sessions List
- **Response**: Array of complete session objects that user has scheduled
- **Note**: This is the PREFERRED endpoint for schedule - returns full session data!

### Speakers List ✅
- **Endpoint**: `/api/speaker/all/en-US`
- **Method**: GET
- **Full URL**: `https://api-v2.ignite.microsoft.com/api/speaker/all/en-US`
- **Headers**: Same as Sessions List
- **Response**: Array of speaker objects (1,579 speakers as of Nov 2025)
- **Cache Strategy**: 60-minute auto-refresh

### My Favorites (IDs Only) ✅
- **Endpoint**: `/api/favorite/1`
- **Method**: GET
- **Full URL**: `https://api-v2.ignite.microsoft.com/api/favorite/1`
- **Response**: Array of internal record IDs for favorited/starred sessions
- **Note**: Returns IDs that need to be matched against session data

### Registered Labs (IDs Only) ✅
- **Endpoint**: `/api/favorite/4`
- **Method**: GET
- **Full URL**: `https://api-v2.ignite.microsoft.com/api/favorite/4`
- **Response**: Array of internal record IDs for registered labs/workshops
- **Note**: Returns IDs that need to be matched against session data

### Deprecated/Redundant Endpoints
- `/api/favorite/2` - My Schedule IDs (use `/api/schedule/sessions/en-US` instead)
- `/api/favorite/3` - Appears to be duplicate of endpoint 2

## Authentication

### Bearer Token
- **Header**: `Authorization: Bearer {token}`
- **Token Location**: Found in cookie `ignite2025.prod.token` on ignite.microsoft.com domain
- **How to Get**: 
  
  **Method 1 (Recommended):**
  1. Sign in to https://ignite.microsoft.com
  2. Open DevTools (F12) → Application tab → Cookies → ignite.microsoft.com
  3. Find cookie named `ignite2025.prod.token`
  4. Copy the cookie value and prefix with `Bearer ` (e.g., `Bearer eyJhbGc...`)
  
  **Method 2 (Console Script):**
  Run this in the browser console on ignite.microsoft.com:
  ```javascript
  (function () {
    const cookies = Object.fromEntries(
      document.cookie.split(";").map(c => {
        const [k, ...v] = c.split("=");
        return [k.trim(), decodeURIComponent(v.join("="))];
      })
    );

    const rawToken = cookies["ignite2025.prod.token"];
    if (!rawToken) {
      console.warn("ignite2025.prod.token cookie not found");
      return null;
    }

    const bearer = `Bearer ${rawToken}`;
    console.log("Bearer token:", bearer);
    return bearer;
  })();
  ```
- **Expiration**: Tokens expire periodically (1 hour)
- **Format**: Long alphanumeric string (JWT-style)

### Required Headers
All API requests require:
```javascript
{
  "Authorization": "Bearer {token}",
  "Accept": "application/json, text/plain, */*",
  "Content-Type": "application/json",
  "Origin": "https://ignite.microsoft.com",
  "Referer": "https://ignite.microsoft.com/",
  "User-Agent": "Mozilla/5.0...",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache"
}
```

## Response Structures

### Session Object
```json
{
  "sessionId": "62a4e3c2-3048-42ea-b08b-f2d640ebf427",
  "sessionCode": "KEY01",
  "title": "Opening Keynote",
  "description": "The opening keynote will feature...",
  "speakerNames": "Judson Althoff, Scott Guthrie, Charles Lamanna, Ryan Roslansky, Asha Sharma",
  "speakerIds": ["ffc0dbbc-866a-4edf-8ef1-12b1425deb72", ...],
  "startDateTime": "2025-11-18T17:00:00Z",
  "endDateTime": "2025-11-18T19:00:00Z",
  "durationInMinutes": 120,
  "location": "Chase Center",
  "sessionType": {"displayValue": "Keynote", "logicalValue": "Keynote"},
  "topic": [{"displayValue": "Other", "logicalValue": "Other"}],
  "sessionLevel": [],
  "audienceTypes": [{"displayValue": "Technical", "logicalValue": "Technical"}],
  "deliveryTypes": [{"displayValue": "In person", "logicalValue": "In person"}],
  "tags": [{"displayValue": "AI", "logicalValue": "AI"}],
  "hasLiveStream": true,
  "hasOnDemand": false,
  "isCapacityControlled": false,
  "enrollmentStatus": "scheduled"
}
```

### Speaker Object
```json
{
  "speakerId": "0d9dfcfa-bbaf-49e8-852d-00322cb6f58d",
  "firstName": "Mark",
  "lastName": "Russinovich",
  "displayName": "Mark Russinovich",
  "jobTitle": "CTO and Technical Fellow",
  "company": "Microsoft",
  "bio": "Mark Russinovich is CTO of Microsoft Azure...",
  "photo": "https://...",
  "social": {
    "twitter": "@markrussinovich",
    "linkedIn": "..."
  },
  "sessionsPresenting": ["c006e0dc-e5d5-4be0-b427-a3deb218d5ec", ...],
  "topic": [{"displayValue": "Migrate and modernize your estate"}],
  "sessionTypes": ["Breakout"],
  "levels": ["Advanced (300)"],
  "audienceTypes": ["Technical"],
  "deliveryTypes": ["In person", "Online"]
}
```

## Cache Implementation

### Sessions Cache
- **File**: `data/sessions-cache.json`
- **Auto-refresh**: Every 15 minutes
- **Structure**:
  ```json
  {
    "sessions": [...],
    "cachedAt": "2025-11-15T12:00:00.000Z",
    "lastUpdated": "2025-11-15T12:00:00.000Z"
  }
  ```

### Speakers Cache
- **File**: `data/speakers-cache.json`
- **Auto-refresh**: Every 60 minutes
- **Structure**:
  ```json
  {
    "speakers": [...],
    "cachedAt": "2025-11-15T12:00:00.000Z"
  }
  ```

## Important Findings

### Favorites vs Schedule Endpoints
1. **Schedule**: Use `/api/schedule/sessions/en-US` - returns full session objects ✅
2. **Favorites**: Use `/api/favorite/1` + `/api/favorite/4` - returns IDs that need matching
3. The favorite endpoints return internal record IDs that appear in session objects' metadata

### Session Matching Strategy
To match favorite IDs to sessions:
1. Fetch all sessions from cache
2. Convert each session to JSON string
3. Check if any favorite ID appears in the stringified session
4. This works because IDs are embedded in various session fields

## Conference Details
- **Name**: Microsoft Ignite 2025
- **Dates**: November 18-22, 2025
- **Location**: San Francisco (Moscone Center, Chase Center, etc.)
- **Sessions**: 1,033 total
- **Speakers**: 1,579 total
- **Session Types**: Keynotes, Breakouts, Labs, Innovation Sessions, Agenda items

## Testing Results

✅ All endpoints confirmed working as of November 15, 2025
✅ Cache system working correctly with auto-refresh
✅ Bearer token authentication successful
✅ Search functionality working across sessions and speakers
✅ Schedule and favorites retrieval working
✅ Integration with Claude Desktop confirmed working

## Notes for Future Updates

- API endpoints are stable for Ignite 2025
- Token expiration requires periodic refresh from website
- Cache files can grow large (sessions-cache.json ~8MB, speakers-cache.json ~2MB)
- All timestamps in UTC (Z suffix)
- Response times: ~2-3 seconds from API, instant from cache
