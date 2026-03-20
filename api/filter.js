const XLSX = require('xlsx');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { manualData, qrpayData } = req.body;
    
    if (!manualData || !qrpayData) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }
    
    // Extract date from datetime string
    const extractDate = (datetime) => {
      if (!datetime) return '';
      const match = String(datetime).match(/\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
      const date = new Date(datetime);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return String(datetime).split(' ')[0];
    };
    
    // Create Set of users who already got bonus
    const bonusSet = new Set();
    
    manualData.forEach(record => {
      const toBank = String(record['To Bank'] || '');
      if (toBank.toUpperCase().includes('BONUS DEPOSIT HARIAN')) {
        const userName = String(record['User Name'] || '').trim().toLowerCase();
        const date = extractDate(record['Date/Time']);
        if (userName && date) {
          bonusSet.add(`${userName}|${date}`);
        }
      }
    });
    
    // Filter QRPay data
    const filteredData = qrpayData.filter(record => {
      const userName = String(record['User Name'] || '').trim().toLowerCase();
      const date = extractDate(record['Date/Time']);
      if (!userName || !date) return false;
      const key = `${userName}|${date}`;
      return !bonusSet.has(key);
    }).map(record => ({
      'User Name': record['User Name'],
      'Deposit': record['Deposit'],
      'Date/Time': record['Date/Time'],
      'Reference': record['Reference'] || '-'
    }));
    
    return res.status(200).json({
      success: true,
      data: filteredData,
      count: filteredData.length,
      message: `Ditemukan ${filteredData.length} user belum dapat bonus`
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Terjadi kesalahan pada server',
      details: error.message 
    });
  }
};
