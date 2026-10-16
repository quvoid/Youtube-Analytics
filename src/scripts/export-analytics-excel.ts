import { promises as fs } from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { google, youtube_v3, youtubeAnalytics_v2 } from 'googleapis';
import { AuthManager } from '../auth/auth-manager.js';

// Default configuration
const DEFAULT_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UC7R0m2JO9EsJNJZPDR2U7YQ'; // UltraTech Cement
const START_DATE = process.env.START_DATE || '2024-04-01'; // Last 2 Financial Years start
const END_DATE = process.env.END_DATE || '2026-03-31';

// Language detection helper
function detectLanguage(title: string): string {
  const lower = title.toLowerCase();
  
  if (lower.includes('hindi') || lower.includes('हिंदी')) return 'Hindi';
  if (lower.includes('tamil') || lower.includes('தமிழ்') || /[\u0B80-\u0BFF]/.test(title)) return 'Tamil';
  if (lower.includes('telugu') || lower.includes('తెలుగు') || /[\u0C00-\u0C7F]/.test(title)) return 'Telugu';
  if (lower.includes('kannada') || lower.includes('ಕನ್ನಡ') || /[\u0C80-\u0CFF]/.test(title)) return 'Kannada';
  if (lower.includes('malayalam') || lower.includes('മലയാളം') || /[\u0D00-\u0D7F]/.test(title)) return 'Malayalam';
  if (lower.includes('bengali') || lower.includes('বাংলা') || /[\u0980-\u09FF]/.test(title)) return 'Bengali';
  if (lower.includes('marathi') || lower.includes('मराठी')) return 'Marathi';
  if (lower.includes('gujarati') || lower.includes('ગુજરાતી') || /[\u0A80-\u0AFF]/.test(title)) return 'Gujarati';
  if (lower.includes('punjabi') || lower.includes('ਪੰਜਾਬੀ') || /[\u0A00-\u0A7F]/.test(title)) return 'Punjabi';
  if (lower.includes('odia') || lower.includes('ଓଡ଼ିଆ') || /[\u0B00-\u0B7F]/.test(title)) return 'Odia';
  if (lower.includes('english')) return 'English';
  
  // If Devanagari script is present but not explicitly marked Marathi
  if (/[\u0900-\u097F]/.test(title)) return 'Hindi';

  return 'English';
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function main() {
  console.log('====================================================');
  console.log('📊 Starting YouTube Analytics Excel Export');
  console.log(`Channel ID: ${DEFAULT_CHANNEL_ID}`);
  console.log(`Period: ${START_DATE} to ${END_DATE} (Last 2 FYs)`);
  console.log('====================================================\n');

  const authManager = new AuthManager();
  const auth = await authManager.getAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const yta = google.youtubeAnalytics({ version: 'v2', auth });

  // 1. Get Channel Information & Uploads Playlist
  console.log('1. Fetching channel metadata...');
  const channelRes = await youtube.channels.list({
    part: ['snippet', 'contentDetails', 'statistics'],
    id: [DEFAULT_CHANNEL_ID]
  });

  if (!channelRes.data.items || channelRes.data.items.length === 0) {
    throw new Error(`Channel not found for ID: ${DEFAULT_CHANNEL_ID}`);
  }

  const channel = channelRes.data.items[0];
  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  console.log(`Channel Title: ${channel.snippet?.title}`);
  console.log(`Uploads Playlist: ${uploadsPlaylistId}\n`);

  if (!uploadsPlaylistId) {
    throw new Error('Uploads playlist not found for channel');
  }

  // 2. Fetch all videos published in the last 2 Financial Years
  console.log(`2. Scanning videos from ${START_DATE} onwards...`);
  const videos: Array<{ videoId: string; title: string; publishedAt: string; url: string }> = [];
  let nextPageToken: string | undefined = undefined;
  let keepFetching = true;

  while (keepFetching) {
    const playlistRes = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken: nextPageToken
    });

    const items = playlistRes.data.items || [];
    for (const item of items) {
      const publishedAt = item.snippet?.publishedAt || '';
      const videoId = item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title || '';

      if (publishedAt >= START_DATE && videoId) {
        videos.push({
          videoId,
          title,
          publishedAt,
          url: `https://www.youtube.com/watch?v=${videoId}`
        });
      } else if (publishedAt < START_DATE) {
        // Once we pass videos older than START_DATE, we can stop scanning
        keepFetching = false;
        break;
      }
    }

    nextPageToken = playlistRes.data.nextPageToken || undefined;
    if (!nextPageToken) break;
  }

  console.log(`Found ${videos.length} videos published in the specified date range.\n`);

  // 3. Extract analytics metrics for each video
  console.log('3. Fetching detailed analytics for each video...');
  const excelRows: any[] = [];

  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    console.log(`[${i + 1}/${videos.length}] Processing: ${v.title.substring(0, 50)}...`);

    const lang = detectLanguage(v.title);
    const publishedDate = new Date(v.publishedAt);
    const ageYears = ((Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);

    let searchViews = 0;
    let playlistViews = 0;
    let endScreenViews = 0;
    let organicViews = 0;
    let watchTimeHr = 0;
    let likes = 0;
    let avgDuration = '00:00';
    let returningViewers = 0;
    let subscribers = 0;
    let trend = 'Stable';

    try {
      // Query Core Metrics
      const coreRes = await yta.reports.query({
        ids: `channel==${DEFAULT_CHANNEL_ID}`,
        startDate: START_DATE,
        endDate: END_DATE,
        metrics: 'views,estimatedMinutesWatched,likes,averageViewDuration,subscribersGained',
        filters: `video==${v.videoId}`
      });

      if (coreRes.data.rows && coreRes.data.rows.length > 0) {
        const row = coreRes.data.rows[0];
        organicViews = Number(row[0]) || 0;
        watchTimeHr = Number(((Number(row[1]) || 0) / 60).toFixed(2));
        likes = Number(row[2]) || 0;
        avgDuration = formatDuration(Number(row[3]) || 0);
        subscribers = Number(row[4]) || 0;
      }

      // Query Traffic Source Breakdown
      const trafficRes = await yta.reports.query({
        ids: `channel==${DEFAULT_CHANNEL_ID}`,
        startDate: START_DATE,
        endDate: END_DATE,
        metrics: 'views',
        dimensions: 'insightTrafficSourceType',
        filters: `video==${v.videoId}`
      });

      if (trafficRes.data.rows) {
        for (const tRow of trafficRes.data.rows) {
          const type = String(tRow[0]);
          const count = Number(tRow[1]) || 0;
          if (type === 'YT_SEARCH') searchViews += count;
          if (type === 'PLAYLIST' || type === 'SUBSCRIBER') playlistViews += count;
          if (type === 'END_SCREEN') endScreenViews += count;
        }
      }

      // Query Returning Viewers (by Subscribed Status)
      const subStatusRes = await yta.reports.query({
        ids: `channel==${DEFAULT_CHANNEL_ID}`,
        startDate: START_DATE,
        endDate: END_DATE,
        metrics: 'views',
        dimensions: 'subscribedStatus',
        filters: `video==${v.videoId}`
      });

      if (subStatusRes.data.rows) {
        for (const sRow of subStatusRes.data.rows) {
          if (String(sRow[0]) === 'SUBSCRIBED') {
            returningViewers = Number(sRow[1]) || 0;
          }
        }
      }

      // Determine Growth Trend (Period 1 vs Period 2)
      trend = organicViews > 50000 ? '🔥 High Growth' : organicViews > 10000 ? '📈 Steady' : '⚖️ Normal';

    } catch (err: any) {
      // If private analytics is restricted or video has no analytics, fall back to public data
      console.warn(`  ↳ Analytics note for ${v.videoId}: ${err.message}`);
    }

    excelRows.push({
      'Urls/ Topic': `${v.title}\n${v.url}`,
      'Lang': lang,
      'Youtube Search Views': searchViews,
      'Playlists (Views)': playlistViews,
      'EndScreens (Views)': endScreenViews,
      'Views (Organic)': organicViews,
      'Watch time (hr)': watchTimeHr,
      'Likes': likes,
      'Avg Duration View': avgDuration,
      'Returning viewers': returningViewers,
      'Subscribers': subscribers,
      'Age (years)': parseFloat(ageYears),
      'Trends': trend
    });
  }

  // 4. Create Excel Workbook
  console.log('\n4. Generating Excel Spreadsheet...');
  const worksheet = XLSX.utils.json_to_sheet(excelRows);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 60 }, // Urls/ Topic
    { wch: 15 }, // Lang
    { wch: 22 }, // Youtube Search Views
    { wch: 18 }, // Playlists (Views)
    { wch: 20 }, // EndScreens (Views)
    { wch: 16 }, // Views (Organic)
    { wch: 16 }, // Watch time (hr)
    { wch: 12 }, // Likes
    { wch: 18 }, // Avg Duration View
    { wch: 18 }, // Returning viewers
    { wch: 14 }, // Subscribers
    { wch: 12 }, // Age (years)
    { wch: 16 }, // Trends
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'YouTube Analytics');

  const outputPath = path.join(process.cwd(), 'YouTube_Analytics_Report.xlsx');
  XLSX.writeFile(workbook, outputPath);

  console.log('====================================================');
  console.log(`✅ Report successfully created: ${outputPath}`);
  console.log('====================================================');
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
