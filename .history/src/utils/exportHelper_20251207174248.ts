import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { JournalEntry } from '../stores/entriesStore';

type ExportFormat = 'txt' | 'pdf' | 'json' | 'csv';

export const exportSingleEntry = async (entry: JournalEntry, format: ExportFormat = 'txt') => {
  try {
    let fileUri = '';
    let mimeType = '';
    let fileName = `MindfulMinute_${entry.date}`;

if (format === 'pdf') {
      fileName += '.pdf';
      mimeType = 'application/pdf';
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&display=swap');
              body { 
                font-family: 'Merriweather', Georgia, serif; 
                padding: 60px; 
                color: #1F2937; 
                background-color: #FDFBF7;
                line-height: 1.8;
              }
              .container {
                max-width: 700px;
                margin: 0 auto;
                border: 1px solid #E5E7EB;
                background: white;
                padding: 50px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.05);
              }
              h1 { 
                color: #3730A3; 
                text-align: center; 
                font-weight: 300; 
                letter-spacing: 2px; 
                text-transform: uppercase; 
                font-size: 24px;
                margin-bottom: 40px; 
                border-bottom: 1px solid #E5E7EB;
                padding-bottom: 20px;
              }
              .meta { 
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 40px; 
                font-family: Helvetica, sans-serif;
                font-size: 12px;
                color: #6B7280;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .prompt-box { 
                margin-bottom: 30px; 
                font-style: italic; 
                color: #4B5563; 
                font-size: 18px;
                text-align: center;
              }
              .content { 
                font-size: 16px; 
                color: #111827; 
                white-space: pre-wrap; 
                margin-bottom: 50px; 
              }
              .footer { 
                text-align: center; 
                font-size: 10px; 
                color: #9CA3AF; 
                font-family: Helvetica, sans-serif; 
                margin-top: 40px; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Mindful Minute</h1>
              <div class="meta">
                <span>${new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span>${entry.moodTag?.value || ''}</span>
              </div>
              <div class="prompt-box">
                "${entry.prompt?.text || entry.promptText || "Freestyle Entry"}"
              </div>
              <div class="content">${entry.text}</div>
              <div class="footer">Recorded in Mindful Minute App</div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      fileUri = uri;

    } else if (format === 'json') {
      fileName += '.json';
      mimeType = 'application/json';
      const jsonContent = JSON.stringify(entry, null, 2);
      fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, jsonContent);

    } else if (format === 'csv') {
      fileName += '.csv';
      mimeType = 'text/csv';
      const cleanText = (entry.text || '').replace(/"/g, '""'); 
      const cleanPrompt = (entry.prompt?.text || '').replace(/"/g, '""');
      const csvContent = `Date,Prompt,Mood,Text\n"${entry.date}","${cleanPrompt}","${entry.moodTag?.value || ''}","${cleanText}"`;
      fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);

    } else {
      // Default TXT
      fileName += '.txt';
      mimeType = 'text/plain';
      const textContent = `Date: ${entry.date}\nPrompt: ${entry.prompt?.text || 'None'}\nMood: ${entry.moodTag?.value || 'None'}\n\n${entry.text}`;
      fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, textContent);
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: mimeType,
        dialogTitle: `Export Entry as ${format.toUpperCase()}`,
        UTI: mimeType 
      });
    } else {
      alert("Sharing is not available on this device");
    }

  } catch (error) {
    console.error("Export failed:", error);
    alert("Failed to export file.");
  }
};
export const exportBulkEntries = async (entries: JournalEntry[], format: ExportFormat = 'json') => {
  try {
    let fileUri = '';
    let mimeType = '';
    const timestamp = new Date().toISOString().split('T')[0];
    let fileName = `MindfulMinute_Full_Export_${timestamp}`;

    if (format === 'pdf') {
      fileName += '.pdf';
      mimeType = 'application/pdf';
      
      let htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: Helvetica, sans-serif; padding: 40px; color: #1F2937; }
              h1 { color: #6366F1; text-align: center; margin-bottom: 10px; }
              .subtitle { text-align: center; color: #6B7280; margin-bottom: 40px; font-size: 12px; }
              .entry { margin-bottom: 30px; page-break-inside: avoid; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; }
              .header { display: flex; justify-content: space-between; border-bottom: 1px solid #F3F4F6; padding-bottom: 10px; margin-bottom: 15px; }
              .date { color: #6366F1; font-weight: bold; font-size: 16px; }
              .mood { background-color: #EEF2FF; color: #6366F1; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
              .prompt { font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 14px; }
              .text { font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #4B5563; }
              .footer { text-align: center; font-size: 10px; color: #9CA3AF; margin-top: 40px; }
            </style>
          </head>
          <body>
            <h1>Mindful Minute Journal</h1>
            <div class="subtitle">Exported on ${new Date().toLocaleDateString()} • ${entries.length} Entries</div>
      `;

      entries.forEach(entry => {
        htmlContent += `
          <div class="entry">
            <div class="header">
              <span class="date">${new Date(entry.date).toLocaleDateString()}</span>
              ${entry.moodTag?.value ? `<span class="mood">${entry.moodTag.value}</span>` : ''}
            </div>
            <div class="prompt">${entry.prompt?.text || entry.promptText || 'Freestyle'}</div>
            <div class="text">${entry.text || ''}</div>
            ${entry.imageUri ? `<div style="margin-top:10px; font-size:10px; color:#999;">[Attached Image]</div>` : ''}
          </div>
        `;
      });

      htmlContent += `
            <div class="footer">Generated by Mindful Minute</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      fileUri = uri;

    } else if (format === 'csv') {
      fileName += '.csv';
      mimeType = 'text/csv';
      let csvContent = 'Date,Time,Mood,Prompt,Text\n';
      
      entries.forEach(entry => {
        const date = entry.date;
        const time = entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString() : '';
        const mood = (entry.moodTag?.value || '').replace(/"/g, '""');
        const prompt = (entry.prompt?.text || entry.promptText || '').replace(/"/g, '""');
        const text = (entry.text || '').replace(/"/g, '""');
        
        csvContent += `"${date}","${time}","${mood}","${prompt}","${text}"\n`;
      });
      
      fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);

    } else {
      // JSON (Default for Backup)
      fileName += '.json';
      mimeType = 'application/json';
      const jsonContent = JSON.stringify(entries, null, 2);
      fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, jsonContent);
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: mimeType,
        dialogTitle: `Download All Data (${format.toUpperCase()})`,
        UTI: mimeType 
      });
    } else {
      alert("Sharing is not available");
    }

  } catch (error) {
    console.error("Bulk export failed:", error);
    alert("Failed to export data.");
  }
};