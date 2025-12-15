import { Platform } from 'react-native';
import * as Print from 'expo-print';
import { useUIStore } from '../stores/uiStore';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { JournalEntry } from '../stores/entriesStore';

export const generateTherapistReport = async (allEntries: JournalEntry[]) => {
  // 1. Filter for last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // Filter and Sort (Oldest first for reading flow)
  const entries = allEntries
    .filter(e => {
      const d = new Date(e.date);
      return d >= thirtyDaysAgo && d <= now;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

if (entries.length === 0) {
    useUIStore.getState().showAlert("No Data", "No entries found in the last 30 days to report.");
    return;
  }

  // 2. Calculate Basic Stats for Header
  const moodCounts: Record<string, number> = {};
  entries.forEach(e => {
    if (e.moodTag?.value) {
      const m = e.moodTag.value;
      moodCounts[m] = (moodCounts[m] || 0) + 1;
    }
  });
  
  const topMood = Object.entries(moodCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';
  const consistency = Math.min(100, Math.round((entries.length / 30) * 100));

  // 3. Generate HTML Template
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                padding: 40px; 
                color: #1F2937; 
                max-width: 800px;
                margin: 0 auto;
            }
            .header { border-bottom: 2px solid #6366F1; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #111827; margin: 0 0 5px 0; font-size: 28px; }
            .subtitle { color: #6B7280; font-size: 14px; }
            
            .stats-container { 
                display: flex; 
                gap: 15px; 
                margin-bottom: 40px; 
                background-color: #F3F4F6;
                padding: 20px;
                border-radius: 12px;
            }
            .stat-box { flex: 1; }
            .stat-value { font-size: 24px; font-weight: 800; color: #4F46E5; }
            .stat-label { font-size: 11px; text-transform: uppercase; color: #6B7280; letter-spacing: 0.5px; font-weight: 600; margin-top: 4px; }

            .section-title { 
                font-size: 16px; 
                font-weight: 700; 
                color: #111827; 
                text-transform: uppercase; 
                letter-spacing: 1px;
                margin-bottom: 20px; 
                border-left: 4px solid #F59E0B;
                padding-left: 10px;
            }

            .entry { margin-bottom: 30px; page-break-inside: avoid; }
            .entry-meta { 
                display: flex; 
                align-items: center; 
                justify-content: space-between;
                background-color: #F9FAFB;
                padding: 10px 15px;
                border-radius: 8px 8px 0 0;
                border: 1px solid #E5E7EB;
                border-bottom: none;
            }
            .date { font-weight: 700; color: #374151; font-size: 14px; }
            .mood-pill { 
                background-color: #EEF2FF; 
                color: #4F46E5; 
                padding: 4px 10px; 
                border-radius: 20px; 
                font-size: 11px; 
                font-weight: 600; 
                text-transform: capitalize;
            }
            
            .entry-content {
                border: 1px solid #E5E7EB;
                border-radius: 0 0 8px 8px;
                padding: 20px;
            }
            .prompt { 
                font-weight: 600; 
                color: #4B5563; 
                margin-bottom: 12px; 
                font-size: 14px;
                line-height: 1.4;
            }
            .response { 
                line-height: 1.6; 
                color: #1F2937; 
                font-size: 15px;
                white-space: pre-wrap; 
            }
            
            .footer { 
                margin-top: 50px; 
                text-align: center; 
                font-size: 12px; 
                color: #9CA3AF; 
                border-top: 1px solid #E5E7EB; 
                padding-top: 20px;
            }
        </style>
      </head>
      <body>
        <div class="header">
            <h1>Patient Journal Summary</h1>
            <div class="subtitle">
                Generated via Micro Muse App &bull; ${now.toLocaleDateString()}
            </div>
            <div class="subtitle" style="margin-top: 4px;">
                Period: ${thirtyDaysAgo.toLocaleDateString()} - ${now.toLocaleDateString()}
            </div>
        </div>

        <div class="stats-container">
            <div class="stat-box">
                <div class="stat-value">${entries.length}</div>
                <div class="stat-label">Entries Found</div>
            </div>
            <div class="stat-box">
                <div class="stat-value" style="text-transform: capitalize;">${topMood}</div>
                <div class="stat-label">Dominant Mood</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${consistency}%</div>
                <div class="stat-label">Consistency</div>
            </div>
        </div>

        <div class="section-title">Journal Entries (Oldest to Newest)</div>

        ${entries.map(e => `
            <div class="entry">
                <div class="entry-meta">
                    <span class="date">${new Date(e.date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    ${e.moodTag?.value ? `<span class="mood-pill">${e.moodTag.value}</span>` : ''}
                </div>
                <div class="entry-content">
                    <div class="prompt">${e.prompt?.text || e.promptText || 'Freestyle Entry'}</div>
                    <div class="response">${e.text}</div>
                </div>
            </div>
        `).join('')}

        <div class="footer">
            Confidential Report - Generated for Professional Review
        </div>
      </body>
    </html>
  `;

// 4. Print & Action
  try {
    const { uri } = await Print.printToFileAsync({ html });
    const filename = `MindfulMinute_Report_${now.toISOString().split('T')[0]}.pdf`;

useUIStore.getState().showAlert(
      "Report Ready",
      "Choose an action:",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Share", 
          onPress: () => Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' }) 
        },
        { 
          text: "Save to Device", 
          onPress: async () => {
            if (Platform.OS === 'android') {
              try {
                // Android: Let user pick a folder
                const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (permissions.granted) {
                  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                  const newUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, 'application/pdf');
                  await FileSystem.writeAsStringAsync(newUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                  useUIStore.getState().showAlert("Saved", "Report saved successfully.");
                }
              } catch (e) {
                console.error(e);
                useUIStore.getState().showAlert("Error", "Could not save file.");
              }
            } else {
              // iOS: Share sheet IS the save mechanism
              await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
          }
        }
      ]
    );

} catch (error) {
    console.error("Report generation failed:", error);
    useUIStore.getState().showAlert("Error", "Could not generate report. Please try again.");
  }
};