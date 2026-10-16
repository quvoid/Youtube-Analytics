# YouTube Analytics Reporting & MCP Server

A Model Context Protocol (MCP) server and automated analytics reporting tool for YouTube channels, with built-in multi-channel/agency support, deep demographics, traffic source breakdown, and automated Excel reporting.

---

## 🎯 Project Objective & Target Excel Structure

This tool extracts video-level and topic-level performance metrics across **all languages** (e.g., `#BaatGharKi` series) for the **last 2 financial years** (FY 2024-25 & FY 2025-26) and generates an Excel report with the following structure:

### Target Excel Headers:
| Column | Header | Description |
|---|---|---|
| **A** | `Urls/ Topic` | Full YouTube Video URL and topic title |
| **B** | `Lang` | Language of the video (Hindi, English, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, etc.) |
| **C** | `Youtube Search Views` | Organic views originating specifically from YouTube Search |
| **D** | `Playlists (Views)` | Views originating from YouTube Playlists |
| **E** | `EndScreens (Views)` | Views driven by Endscreen elements |
| **F** | `Views (Organic)` | Total organic views on the video |
| **G** | `Watch time (hr)` | Total watch time accumulated (in hours) |
| **H** | `Likes` | Total likes received |
| **I** | `Avg Duration View` | Average view duration (MM:SS) |
| **J** | `Returning viewers` | Returning viewer traffic / retention metric |
| **K** | `Subscribers` | Net subscribers gained from the video |
| **L** | `Age (years)` | Video age in years since publish date |
| **M** | `Trends` | Performance trend / period-over-period growth |

---

## 🚀 Quick Setup on Another Machine

Follow these steps if you are setting up this repository on the laptop that has the authorized Google account:

### 1. Prerequisites
- **Node.js** (v18 or higher): [Download Node.js](https://nodejs.org/)
- **Git**: [Download Git](https://git-scm.com/)

### 2. Clone the Repository
```bash
git clone https://github.com/quvoid/Youtube-Analytics.git
cd Youtube-Analytics
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Google Cloud OAuth Credentials
1. In Google Cloud Console:
   - Ensure **YouTube Data API v3** and **YouTube Analytics API** are enabled.
   - Go to **Credentials** > Create **OAuth 2.0 Client ID** (Desktop Application).
   - Under **OAuth consent screen > Test users**, make sure your Google account email is added.
2. Download the JSON credentials file and place it at:
   ```
   src/auth/credentials.json
   ```
   *(See `src/auth/credentials.template.json` for reference).*

### 5. Authenticate with Google
Run the built-in authentication script:
```bash
npm run auth
```
- It will automatically display an authorization link and listen on port `8888`.
- Open the link in your browser, log in with the authorized account, grant permissions, and approve.
- A success message will appear and the access token will automatically be saved to `src/auth/token.json`.

### 6. Build the Project
```bash
npm run build
```

---

## 🏢 Multi-Channel & Agency Features

This server includes full support for agencies managing multiple client channels:
- Every tool accepts an optional **`channelId`** parameter (e.g. `UC7R0m2JO9EsJNJZPDR2U7YQ`).
- Query any client channel where your Google account has been added as a **Viewer** or **Manager** in YouTube Studio.
- Set a default channel in your environment:
  ```bash
  export YOUTUBE_CHANNEL_ID="UC7R0m2JO9EsJNJZPDR2U7YQ"
  ```

---

## 🤖 Using as an MCP Server (Claude Desktop / Cursor)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "youtube-analytics": {
      "command": "node",
      "args": [
        "/path/to/Youtube-Analytics/build/index.js"
      ],
      "env": {
        "YOUTUBE_CHANNEL_ID": "UC7R0m2JO9EsJNJZPDR2U7YQ"
      }
    }
  }
}
```

---

## 🛠️ Available MCP Tools

- `get_channel_info`: Get channel statistics & snippet by `channelId`
- `get_channel_videos`: List videos with search query & date range filters
- `get_channel_overview`: Channel vital signs (views, watch time, subs gained/lost)
- `get_comparison_metrics`: Compare metrics between two time periods
- `get_traffic_sources`: Breakdown by YouTube search, playlists, suggested videos, etc.
- `get_video_demographics`: Age & gender audience breakdown
- `get_geographic_distribution`: Country-wise view and watch time distribution
- `get_audience_retention`: Frame-by-frame retention percentage
- `get_retention_dropoff_points`: Pinpoints exact moments where viewers drop off
- `get_engagement_metrics`: Likes, comments, and shares analysis
- `get_optimal_posting_time`: Day-of-week engagement pattern analysis
