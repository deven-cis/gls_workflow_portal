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

export default {
  createAttorneySection,
  getInitials
};
