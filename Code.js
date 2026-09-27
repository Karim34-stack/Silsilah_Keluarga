// ============================================================
// Google Apps Script API untuk Database Silsilah Keluarga
// ============================================================

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return responseJSON([]);
    }
    
    var headers = data[0];
    var result = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = row[j];
      }
      result.push(obj);
    }

    return responseJSON(result);
  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  }
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    if (action === 'saveAll') {
      var members = payload.members;
      
      // Hapus data lama kecuali baris header (Baris 1)
      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      }

      // Susun ulang baris data untuk dimasukkan ke Spreadsheet
      var rows = members.map(function(m) {
        return [
          m.id || '',
          m.nama || '',
          m.gender || 'L',
          m.generasi !== undefined ? m.generasi : 1,
          m.status || 'Hidup',
          m.ayahId || '',
          m.ibuId || '',
          m.pasanganId || '',
          m.foto || '',
          m.catatan || ''
        ];
      });

      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }

      return responseJSON({ status: 'success' });
    }
    
    return responseJSON({ status: 'invalid_action' });
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
