import { galloInstance } from './galloInstance.js';
import { formatTime12Hour } from '@/lib/utils';
import { endpoints } from '@/constants/endpoints';

const mapJobToTask = (job) => {
  const jobDate = new Date(job.job_date);
  const dateStr = jobDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time24 = job.start_time ? job.start_time.substring(0, 5) : '00:00';
  const timeStr = formatTime12Hour(time24);
  
  return {
    id: job.job_no,
    jobId: `Job${job.job_no}`,
    date: dateStr,
    time: timeStr,
    title: job.case?.case_short_name || `Job #${job.job_no}`,
    location: job.zoom_meeting_id ? 'Virtual - Zoom' : `${job.job_loc_name || ''}, ${job.job_loc_city || ''}`,
    status: job.computed_status,
    caseNo: job.case_no,
    caseInfo: {
      id: job.case?.id,
      name: job.case?.case_short_name,
      caseNumber: job.case?.case_number,
    },
    type: job.case?.case_type,
    details: job.scheduling_notes_html || job.confirmation_notes_html || '',
    isVirtual: !!job.zoom_meeting_id,
    zoomMeetingId: job.zoom_meeting_id,
  };
};

export const taskAPI = {
  
};

/**
 * Auth API endpoints
 */
export const authAPI = {
  login: async (login_name, login_password) => {
    const response = await galloInstance(endpoints.auth.login(), {
      method: 'POST',
      body: JSON.stringify({ login_name, login_password }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Backend returns: { status_code, success, result: { access_token, refresh_token, ... } }
    if (response && response.success === false) {
      const message = response?.result?.message || response?.message || 'Login failed';
      throw new Error(message);
    }
    return response?.result ?? response;
  },

  logout: () => {
    // Clear tokens from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    return Promise.resolve();
  },

  getProfile: async () => {
    return galloInstance('/auth/users/me');
  },


  refreshToken: async (refreshToken) => {
    const response = await galloInstance(endpoints.auth.refreshToken(), {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Backend may return either { access_token, refresh_token? } OR { success, result: { access_token, ... } }
    if (response && response.success === false) {
      const message = response?.result?.message || response?.message || 'Token refresh failed';
      throw new Error(message);
    }
    return response?.result ?? response;
  },
};


export default {
  taskAPI,
  authAPI
};
