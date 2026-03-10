import { galloInstance } from './galloInstance';
import { getUser } from '@/lib/auth';
import { resolveFileUrl } from '@/lib/config';
import { endpoints } from '@/constants/endpoints';

const resolveImageUrl = resolveFileUrl;

const mapUserToAssignee = (user, currentResourceId) => {
    if (!user) return null;
    return {
        rsrc_no: user.rsrc_no || '',
        name: user.full_name || user.name || 'Unknown',
        avatar_url: resolveImageUrl(user.profile_image_url),
        is_current_resource: currentResourceId === user.rsrc_no,
    };
};

export const assigneeAPI = {
    getAvailableAssignees: async () => {
        try {
            const currentUser = getUser();
            const currentResourceId = currentUser?.rsrc_no || ''
            
            const response = await galloInstance(
                endpoints.users.assigneeUsersList()
            );
            if (!response?.success) return [];
            
            return (response.result || []).map(user => mapUserToAssignee(user, currentResourceId));
        } catch (err) {
            console.warn('Failed to get assignees:', err);
            return [];
        }
    },

    reassignJob: async (jobId, userId, reason) => {
        const currentUser = getUser();
        if (!currentUser?.rsrc_no) {
            throw new Error('Please log in again.');
        }

        const response = await galloInstance(endpoints.jobs.reassign(), {
            method: 'POST',
            body: JSON.stringify({
                assignee_rsrc_no: userId,
                job_id: jobId,
                reason,
            }),
        });

        if (!response?.success) {
            throw new Error(response?.message || 'Failed to reassign job');
        }

        return response;
    },
};
