import { galloInstance } from './galloInstance.js';
import { endpoints } from '@/constants/endpoints';

// Helper function to build FormData for billing (shared between create and update)
const buildBillingFormData = (billingInfo, jobNo = null) => {
    const formData = new FormData();
    
    if (jobNo) {
        formData.append('job_no', jobNo);
    }
    
    formData.append('cancel_en_route', billingInfo.cancelEnRoute ? 'true' : 'false');
    formData.append('cancel_setup', billingInfo.cancelSetup ? 'true' : 'false');

    if (billingInfo.notes) {
        formData.append('billing_notes', billingInfo.notes);
    }
    if (billingInfo.videographerHours) {
        formData.append('videographer_hours_present', billingInfo.videographerHours);
    }
    if (billingInfo.fileLengthHours) {
        formData.append('file_hours_length', billingInfo.fileLengthHours);
    }
    console.log('billingInfo for billing', billingInfo);
    // Attach new/additional documents (files that have File objects)
    (billingInfo.documents || []).forEach((doc) => {
        if (doc.file) {
            formData.append('files', doc.file);
        }
    });

    return formData;
};

export const billingAPI = {
    // Get billing information for a job by job_no
    // Backend endpoint: GET /billings/get/{job_no}
    // Returns null if billing doesn't exist (404) - this is not an error, just means no billing yet
    getJobBilling: async (jobNo) => {
        try {
            const response = await galloInstance(endpoints.billings.get(jobNo));
            return response?.result || null;
        } catch (err) {
            // Handle 404 as "no billing found" - not an error, just means billing hasn't been created yet
            if (err?.status === 404 || 
                err?.message?.includes('404') || 
                err?.message?.includes('not found') ||
                err?.message?.includes('Billing for job_no')) {
                console.log(`No billing found for job ${jobNo} - this is expected for new jobs`);
                return null;
            }
            // Re-throw other errors (network errors, 500, etc.)
            console.error('Error fetching billing data:', err);
            throw err;
        }
    },

    // Create billing information for a job
    createBilling: async (jobNo, billingInfo, cameraFile = null) => {
        const formData = buildBillingFormData(billingInfo, jobNo);
        if (cameraFile) {
            formData.append('camera_captured_file', cameraFile);
        }
        return galloInstance(endpoints.billings.create(), {
            method: 'POST',
            body: formData,
        });
    },

    // Update billing information - only sends changed fields
    updateBilling: async (billingId, billingInfo, originalBillingInfo, jobNo = null, cameraFile = null, shouldRemoveCameraFile = false) => {
        const formData = new FormData();
        
        if (jobNo) {
            formData.append('job_no', jobNo);
        }
        
        // Only send fields that have changed
        if (billingInfo.cancelEnRoute !== originalBillingInfo?.cancelEnRoute) {
            formData.append('cancel_en_route', billingInfo.cancelEnRoute ? 'true' : 'false');
        }
        
        if (billingInfo.cancelSetup !== originalBillingInfo?.cancelSetup) {
            formData.append('cancel_setup', billingInfo.cancelSetup ? 'true' : 'false');
        }
        
        if (billingInfo.notes !== originalBillingInfo?.notes) {
            formData.append('billing_notes', billingInfo.notes || '');
        }
        
        if (billingInfo.videographerHours !== originalBillingInfo?.videographerHours) {
            formData.append('videographer_hours_present', billingInfo.videographerHours || '');
        }
        
        if (billingInfo.fileLengthHours !== originalBillingInfo?.fileLengthHours) {
            formData.append('file_hours_length', billingInfo.fileLengthHours || '');
        }
        console.log('billingInfo for billing', billingInfo);
        // Handle new documents (files that have File objects - these are new uploads)
        (billingInfo.documents || []).forEach((doc) => {
            if (doc.file) {
                formData.append('files', doc.file);
            }
        });
        
        // Handle document removal - send list of document IDs to remove
        if (billingInfo.documentsToRemove && billingInfo.documentsToRemove.length > 0) {
            billingInfo.documentsToRemove.forEach((docId) => {
                formData.append('remove_documents', docId.toString());
            });
        }

        // Handle camera file
        if (cameraFile) {
            formData.append('camera_captured_file', cameraFile);
        } else if (shouldRemoveCameraFile) {
            const emptyCameraFile = new File([], '', { type: 'application/octet-stream' });
            formData.append('camera_captured_file', emptyCameraFile);
        }

        return galloInstance(endpoints.billings.update(billingId), {
            method: 'PUT',
            body: formData,
        });
    },

    // Delete billing information
    // Backend endpoint: DELETE /billings/delete/{billing_id}
    // Backend returns: { status_code, message, success, result }
    deleteBilling: async (billingId) => {
        const response = await galloInstance(endpoints.billings.delete(billingId), {
            method: 'DELETE',
        });
        return response;
    },
};


