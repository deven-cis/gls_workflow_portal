import { galloInstance } from './galloInstance';
import { getUser } from '@/lib/auth';
import { resolveFileUrl } from '@/lib/config';
import { endpoints } from '@/constants/endpoints';

const resolveImageUrl = resolveFileUrl;

const mapUserToAssignee = (user, currentUserId) => {
    if (!user) return null;
    return {
        id: user.id,
        name: user.full_name || user.name || 'Unknown',
        avatar_url: resolveImageUrl(user.profile_image_url),
        is_current_user: currentUserId === user.id,
        entered_by: user.entered_by,
    };
};

export const assigneeAPI = {
    getAvailableAssignees: async () => {
        try {
            const currentUser = getUser();
            const currentUserId = currentUser?.id || currentUser?.user_id;
            
            const response = await galloInstance(
                endpoints.users.assigneeUsersList()
            );
            if (!response?.success) return [];
            
            return (response.result || []).map(user => mapUserToAssignee(user, currentUserId));
        } catch (err) {
            console.warn('Failed to get assignees:', err);
            return [];
        }
    },

    reassignJob: async (jobId, userId, enteredBy, reason) => {
        const currentUser = getUser();
        if (!currentUser?.entered_by) {
            throw new Error('Please log in again.');
        }

        const response = await galloInstance(endpoints.jobs.reassign(), {
            method: 'POST',
            body: JSON.stringify({
                assignee_user_id: userId,
                assignee_entered_by: enteredBy,
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
