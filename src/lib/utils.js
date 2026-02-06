// Helper utilities extracted from task-details page

export const createAttorneySection = (title) => ({
  id: `${title.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 9)}`,
  title,
  fields: {
    attorneyName: '',
    firmName: '',
    notes: '',
    orderDetails: ''
  },
  documents: [],
  cameraCapture: null
});

export const getInitials = (name = '') => {
  const [first = '', second = ''] = name.split(' ');
  return `${first.charAt(0)}${second.charAt(0)}`.trim().toUpperCase() || first.charAt(0).toUpperCase();
};

/**
 * Convert 24-hour time format (HH:MM) to 12-hour AM/PM format
 * @param {string} time24 - Time in 24-hour format (e.g., "15:00", "09:30")
 * @returns {string} Time in 12-hour AM/PM format (e.g., "3:00 PM", "9:30 AM")
 */
export const formatTime12Hour = (time24) => {
  if (!time24) return '';
  
  // Handle different time formats
  const timeStr = String(time24).trim();
  if (!timeStr) return '';
  
  // Extract hours and minutes
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Handle invalid time
  if (isNaN(hours) || isNaN(minutes)) {
    // Try to extract just the time part if it's in a different format
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      return formatTime12Hour(`${h}:${m}`);
    }
    return timeStr; // Return original if can't parse
  }
  
  // Convert to 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for midnight
  const minutesStr = minutes.toString().padStart(2, '0');
  
  return `${hours12}:${minutesStr} ${period}`;
};

/**
 * Validates case name and case number
 * @param {string} caseName - Case name to validate
 * @param {string} caseNumber - Case number to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateCaseDetails = (caseName, caseNumber) => {
  const errors = [];
  const trimmedCaseName = String(caseName ?? '').trim();
  const trimmedCaseNumber = String(caseNumber ?? '').trim();
  
  if (!trimmedCaseName) errors.push('Case Name is required');
  if (!trimmedCaseNumber) errors.push('Case Number is required');
  
  return { isValid: errors.length === 0, errors };
};

/**
 * Validates witnesses section
 * @param {Array} witnesses - Array of witnesses
 * @param {Object} witnessRecords - Object mapping witness IDs to records
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateWitnesses = (witnesses, witnessRecords) => {
  const errors = [];
  
  if (!witnesses || witnesses.length === 0) {
    errors.push('Please add at least one witness before marking as done');
    return { isValid: false, errors };
  }
  
  // Check if all witnesses have at least one record
  const witnessesWithoutRecords = witnesses.filter(w => {
    const records = witnessRecords[w.id] || [];
    return records.length === 0;
  });
  
  if (witnessesWithoutRecords.length > 0) {
    const names = witnessesWithoutRecords.map(w => w.name || 'Unnamed Witness').join(', ');
    errors.push(`Please add at least one video record for: ${names}`);
  }
  
  return { isValid: errors.length === 0, errors };
};

/**
 * Validates attorneys section
 * @param {Array} attorneySections - Array of attorney sections
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateAttorneys = (attorneySections) => {
  const errors = [];
  
  if (!attorneySections || attorneySections.length === 0) {
    errors.push('Please add at least one attorney before marking as done');
    return { isValid: false, errors };
  }
  
  const isSectionValid = (section) => {
    return (
      section.fields?.attorneyName?.trim() &&
      section.fields?.firmName?.trim() &&
      section.fields?.notes?.trim() &&
      section.fields?.orderDetails?.trim()
    );
  };
  
  const incompleteSections = attorneySections.filter(section => !isSectionValid(section));
  
  if (incompleteSections.length > 0) {
    const incompleteNames = incompleteSections.map(section => 
      section.fields?.attorneyName?.trim() || section.title
    );
    const message = incompleteSections.length === 1
      ? `Please complete "${incompleteNames[0]}" form before marking as done`
      : `Please complete all incomplete forms (${incompleteNames.join(', ')}) before marking as done`;
    errors.push(message);
  }
  
  return { isValid: errors.length === 0, errors };
};

/**
 * Validates billing section
 * @param {Object} billingInfo - Billing information object
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateBillings = (billingInfo) => {
  const errors = [];
  
  // Billing section can be marked as done even if empty
  // Add specific validations if needed in the future
  // For now, always valid
  return { isValid: true, errors };
};

/**
 * Validates equipment time section
 * @param {Object} equipmentInfo - Equipment information object
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validateEquipmentTime = (equipmentInfo) => {
  const errors = [];
  
  // Equipment section can be marked as done even if empty
  // Add specific validations if needed in the future
  // For now, always valid
  return { isValid: true, errors };
};

/**
 * Shared utility function to download a file from the API
 * @param {string} downloadUrl - Full URL to download from
 * @param {string} defaultFileName - Default filename if not found in headers
 * @returns {Promise<boolean>} True if download succeeded
 */
export const downloadFile = async (downloadUrl, defaultFileName = 'download.mp4') => {
  try {
    // Get the access token for authentication
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    
    // Fetch the file with authentication
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    // Get the blob data
    const blob = await response.blob();
    
    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('content-disposition');
    let fileName = defaultFileName;
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (fileNameMatch && fileNameMatch[1]) {
        fileName = fileNameMatch[1].replace(/['"]/g, '');
      }
    }
    
    // Create a download link and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the object URL
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (err) {
    console.error('Failed to download file:', err);
    throw err;
  }
};

/**
 * Fetch video file size from file path using HEAD request
 * @param {string} filePath - Relative or absolute file path
 * @param {string} baseUrl - Base URL for the API (optional, defaults to API_BASE_URL from config)
 * @returns {Promise<number|null>} File size in bytes, or null if unavailable
 */
export const fetchVideoFileSize = async (filePath, baseUrl = null) => {
  if (!filePath || typeof window === 'undefined') return null;
  
  try {
    // Use provided baseUrl or get from config
    if (!baseUrl) {
      const { API_BASE_URL } = await import('@/lib/config');
      baseUrl = API_BASE_URL;
    }
    const videoUrl = filePath.startsWith('http') ? filePath : `${baseUrl}/${filePath}`;
    const token = localStorage.getItem('access_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(videoUrl, { 
      method: 'HEAD', // Use HEAD to get headers without downloading the file
      headers 
    });
    
    if (!response.ok) return null;
    
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : null;
  } catch (error) {
    console.error('Failed to fetch video file size:', error);
    return null;
  }
};

/**
 * Fetch document file size from file path using HEAD request
 * @param {string} filePath - Relative or absolute file path
 * @param {string} baseUrl - Base URL for the API (optional, defaults to API_BASE_URL from config)
 * @returns {Promise<number|null>} File size in bytes, or null if unavailable
 */
export const fetchDocumentFileSize = async (filePath, baseUrl = null) => {
  if (!filePath || typeof window === 'undefined') return null;
  
  try {
    // Use provided baseUrl or get from config
    if (!baseUrl) {
      const { API_BASE_URL } = await import('@/lib/config');
      baseUrl = API_BASE_URL;
    }
    const documentUrl = filePath.startsWith('http') ? filePath : `${baseUrl}/${filePath}`;
    const token = localStorage.getItem('access_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(documentUrl, { 
      method: 'HEAD', // Use HEAD to get headers without downloading the file
      headers,
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) return null;
    
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : null;
  } catch (error) {
    console.warn('Failed to fetch document file size:', error);
    return null;
  }
};

/**
 * Format bytes to MB string
 * @param {number|null|string} bytes - File size in bytes
 * @returns {string} Formatted size string (e.g., "3.5MB" or "N/A")
 */
export const formatFileSizeMB = (bytes) => {
  if (bytes == null || bytes === 'N/A' || bytes === '') return 'N/A';
  if (typeof bytes === 'string') return bytes; // Already formatted
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return 'N/A';
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export default {
  createAttorneySection,
  getInitials,
  formatTime12Hour,
  validateCaseDetails,
  validateWitnesses,
  validateAttorneys,
  validateBillings,
  validateEquipmentTime,
  downloadFile,
  fetchVideoFileSize,
  formatFileSizeMB
};
