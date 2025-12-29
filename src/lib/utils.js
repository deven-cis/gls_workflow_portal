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
  documents: []
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

export default {
  createAttorneySection,
  getInitials,
  formatTime12Hour,
  validateCaseDetails,
  validateWitnesses,
  validateAttorneys,
  validateBillings,
  validateEquipmentTime
};
