# What's Changed: 2025.0.1 → 2025.0.2

## Release Date
November 15, 2025

## Overview
Version 2025.0.2 focuses on improving documentation clarity, enhancing search accuracy, fixing API endpoint issues, and adding comprehensive release testing procedures. This release improves user experience with better bearer token acquisition instructions and refined search functionality.

---

## 🚀 Major Improvements

### Enhanced Bearer Token Documentation
**Improved user onboarding with clearer token acquisition instructions**

- **New Method 1 (Recommended)**: Direct cookie extraction from DevTools
  - Navigate to Application tab → Cookies → `ignite.microsoft.com`
  - Find `ignite2025.prod.token` cookie
  - Copy and prefix with `Bearer `
  
- **New Method 2**: Console script for automated extraction
  - JavaScript snippet to extract token from cookies
  - Automatic Bearer prefix handling
  - Clear error messages if cookie not found

- **Updated Files**:
  - `.env.example` - Detailed instructions with both methods
  - `README.md` - Quick Start section with step-by-step guide
  - `API_RESEARCH.md` - Complete authentication documentation

### Search Functionality Improvements
**More accurate and precise search results**

#### Session Search Enhancements
- **Speaker Name Matching**: 
  - Word boundary matching to avoid false positives
  - Prevents "Mark" from matching "marketing"
  - Exact word matching in speaker names
  
- **Tag Structure Support**:
  - Updated to handle `{displayValue, logicalValue}` tag format
  - Searches both display and logical values
  - Better tag filtering accuracy

#### Speaker Search Refinements
- **Focused Field Searching**:
  - Limited to: `firstName`, `lastName`, `displayName`, `company`
  - Removed bio and jobTitle from default search (reducing false positives)
  
- **New Precise Search Options**:
  - `firstNameOnly`: Word boundary matching in first name field
  - `lastNameOnly`: Word boundary matching in last name field
  - Better results for common names

### Session Details API Fix
**Corrected endpoint format for session lookup**

- **Issue**: Incorrect endpoint format `/api/session/{id}/en-US`
- **Fixed**: Correct format `/api/session/{id}`
- **Added**: Automatic `localizedId` handling
  - Auto-prefixes plain sessionId with "en-US-"
  - Supports both formats: `sessionId` and `localizedId`
  - Fallback to cache before API call

---

## 📝 Documentation Updates

### README.md Streamlining
**Simplified and reorganized for better readability**

- **Removed**:
  - Repetitive prerequisites section
  - Verbose tool descriptions (moved to reference table)
  - Redundant API endpoint lists
  - Excessive troubleshooting details
  
- **Added**:
  - Quick Start section (3 clear steps)
  - VS Code Copilot configuration example
  - Concise MCP Tools Reference table
  - Streamlined Caching & Data section
  
- **Result**: README reduced from 290+ lines to ~160 lines while maintaining all essential information

### New Release Testing Guide
**Comprehensive testing procedures for quality assurance**

- **New File**: `RELEASE_TESTING.md`
- **Content**: 7 test phases with 20+ test cases
  - Clean state testing
  - Cached response testing
  - Force refresh testing
  - Cache expiration testing
  - Search functionality testing
  - Schedule and favorites testing
  - Session details testing
  - Error handling tests
  
- **Features**:
  - Test completion checklist
  - Example prompts for each test
  - Clear validation criteria
  - Important note: Server restart only needed after `npm run build`


---

## 🔧 Technical Changes

### Code Improvements

#### Cache Terminology Clarification
- Changed "auto-refresh" to "cache expires" for accuracy
- Updated cache age messages throughout
- Clearer cache expiration logic in comments

#### Tool Descriptions
- `get_all_sessions`: Updated description for clarity
- `get_all_speakers`: Updated description for clarity
- `search_speakers`: More precise description of search fields

#### Type Definitions
- Updated `Session` interface to use proper tag structure:
  ```typescript
  tags?: Array<{displayValue?: string; logicalValue?: string}>;
  ```

### Search Algorithm Updates

#### Session Search Logic
```typescript
// Before: Simple substring matching
speakers?.some((s) => s.toLowerCase().includes(queryLower))

// After: Word boundary matching
const nameWords = nameLower.split(/\s+/);
matchesSpeakers = nameWords.some(word => word === queryLower) || nameLower.includes(queryLower);
```

#### Speaker Search Logic
```typescript
// Before: Searched all fields including bio and jobTitle
bio?.toLowerCase().includes(queryLower) || jobTitle?.toLowerCase().includes(queryLower)

// After: Focused on name and company only
displayName.includes(queryLower) || firstName.includes(queryLower) || 
lastName.includes(queryLower) || company.includes(queryLower)
```

---

## 🐛 Bug Fixes

### Session Details Endpoint
- **Fixed**: Incorrect API endpoint format
- **Impact**: `get_session_details` now works correctly
- **Added**: Support for both `sessionId` and `localizedId` formats

### Search False Positives
- **Fixed**: Speaker name matching in session search
- **Fixed**: Bio/job title noise in speaker search
- **Impact**: More relevant search results

---

## 📦 Files Changed

| File | Type | Description |
|------|------|-------------|
| `package.json` | Modified | Version bump: 2025.0.1 → 2025.0.2 |
| `src/index.ts` | Modified | Search improvements, endpoint fix, updated descriptions |
| `README.md` | Modified | Streamlined and reorganized content |
| `.env.example` | Modified | Enhanced bearer token instructions |
| `API_RESEARCH.md` | Modified | Added cookie extraction methods |
| `.vscode/mcp.json` | Added | VS Code configuration example |
| `RELEASE_TESTING.md` | Added | Comprehensive testing guide |

---

## 📊 Statistics

- **Lines of Code Changed**: ~250 additions, ~200 deletions
- **Documentation Pages Added**: 2 (RELEASE_TESTING.md, .vscode/mcp.json)
- **Documentation Pages Updated**: 3 (README.md, .env.example, API_RESEARCH.md)
- **Bug Fixes**: 3 (endpoint format, search accuracy, tag structure)
- **New Features**: 2 (firstNameOnly/lastNameOnly search options, VS Code config)

---

## 🎯 Testing

All changes have been validated through:
- Manual testing with Claude Desktop
- API endpoint verification
- Cache behavior validation
- Search result accuracy checks

For complete testing procedures, see `RELEASE_TESTING.md`.

---

## 🙏 Contributors

- Eric2XU (@Eric2XU) - All changes in this release

---

## 📌 Notes

- Bearer tokens still expire after ~1 hour (no changes to token lifetime)
- Cache refresh intervals unchanged (15 min sessions, 60 min speakers)
- All 7 MCP tools remain the same (no additions or removals)
- API endpoints remain unchanged (bug fix was client-side only)

---

## 🔮 Future Considerations

Items identified but not addressed in this release:
- Token refresh mechanism (still requires manual token refresh)
- Batch search operations
- Custom cache expiration settings
- Additional filtering options for session search

---

## 📖 Resources

- [Full README](README.md) - Complete setup and usage guide
- [API Research](API_RESEARCH.md) - Detailed API documentation
- [Release Testing](RELEASE_TESTING.md) - Testing procedures

---

**Full Changelog**: https://github.com/Eric2XU/mcp-ignite-server/compare/2025.0.1...2025.0.2
