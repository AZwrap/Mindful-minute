import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

// --- HELPERS ---
const sanitize = (text) => (text || '').replace(/"/g, '""'); // Escape quotes for CSV

// --- 1. EXPORT SINGLE ENTRY ---
export const exportSingleEntry = async (entry, format = 'pdf') => {
  try {
    let fileUri = '';
    const dateStr = new Date(entry.date).toISOString().split('T')[0];
    const fileName = `journal_${dateStr}`;

    if (format === 'pdf') {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
              h1 { color: #6366F1; border-bottom: 2px solid #eee; padding-bottom: 10px; }
              .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
              .text { font-size: 16px; line-height: 1.6; white-space: pre-wrap; }
              .mood { display: inline-block; background: #EEF2FF; color: #6366F1; padding: 4px 8px; border-radius: 8px; font-weight: bold; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1>${new Date(entry.date).toDateString()}</h1>
            <div class="meta">
              ${entry.moodTag ? `<span class="mood">${entry.moodTag.value}</span>` : ''}
              ${entry.prompt?.text ? `<p><strong>Prompt:</strong> ${entry.prompt.text}</p>` : ''}
            </div>
            <div class="text">${entry.text}</div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      fileUri = uri;
    } 
    
    else if (format === 'json') {
      const jsonContent = JSON.stringify(entry, null, 2);
      fileUri = FileSystem.documentDirectory + `${fileName}.json`;
      await FileSystem.writeAsStringAsync(fileUri, jsonContent);
    } 
    
    else if (format === 'csv') {
      const header = 'Date,Mood,Prompt,Text\n';
      const row = `"${entry.date}","${entry.moodTag?.value || ''}","${sanitize(entry.prompt?.text)}","${sanitize(entry.text)}"\n`;
      fileUri = FileSystem.documentDirectory + `${fileName}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, header + row);
    }

    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    }
  } catch (error) {
    console.error("Export failed:", error);
    throw error;
  }
};

// --- 2. BATCH EXPORT (For later) ---
export const exportBatchEntries = async (entries, format = 'csv') => {
    // Implementation for Step 2...
};