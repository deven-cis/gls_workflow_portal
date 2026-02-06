import { galloInstance } from './galloInstance';
import { endpoints } from '@/constants/endpoints';

export const attorneysAPI = {
    // Get all attorneys for a job
    getJobAttorneys: async (jobId) => {
        const response = await galloInstance(endpoints.attorneys.listByJob(jobId));
        console.log('✅ API: Attorneys response:', response);
        // Return the result array from backend response
        return response?.result || [];
    },

    // Create attorney for a job
    // Backend expects FormData with: job_no, attorney_name, firm_name, notes, order_details, document (optional file), camera_captured_file (optional file)
    createJobAttorney: async (jobId, attorneyData, file = null, cameraFile = null) => {
        console.log('Creating attorney with data:', { jobId, ...attorneyData, hasFile: !!file, hasCameraFile: !!cameraFile });
        
        // Use FormData to match backend API signature (Form fields + optional File)
        const formData = new FormData();
        formData.append('job_no', jobId.toString());
        formData.append('attorney_name', attorneyData.attorneyName || '');
        formData.append('firm_name', attorneyData.firmName || '');
        formData.append('notes', attorneyData.notes || '');
        formData.append('order_details', attorneyData.orderDetails || '');
        
        // Append document file if provided (backend expects 'document' as parameter name)
        if (file) {
            formData.append('document', file);
        }
        
        // Append camera captured file if provided (backend expects 'camera_captured_file' as parameter name)
        if (cameraFile) {
            formData.append('camera_captured_file', cameraFile);
        }
        
        // galloInstance automatically handles FormData (doesn't set Content-Type)
        const response = await galloInstance(endpoints.attorneys.create(), {
            method: 'POST',
            body: formData,
        });
        console.log('Attorney creation response:', response);
        return response;
    },

    // Update attorney (with optional file upload/removal)
    // Backend expects FormData with: attorney_name, firm_name, notes, order_details, document (optional file), camera_captured_file (optional file)
    // If document is explicitly removed (empty), send empty field to remove it
    updateAttorney: async (attorneyId, attorneyData, file = null, shouldRemoveDocument = false, cameraFile = null, shouldRemoveCameraFile = false) => {
        console.log('Updating attorney with data:', { attorneyId, ...attorneyData, hasFile: !!file, shouldRemoveDocument, hasCameraFile: !!cameraFile, shouldRemoveCameraFile });
        
        // Use FormData to match backend API signature (Form fields + optional File)
        const formData = new FormData();
        formData.append('attorney_name', attorneyData.attorneyName || '');
        formData.append('firm_name', attorneyData.firmName || '');
        formData.append('notes', attorneyData.notes || '');
        formData.append('order_details', attorneyData.orderDetails || '');
        
        // Handle document field:
        // - If file provided → send file (upload/replace)
        // - If shouldRemoveDocument is true → send empty file with empty filename (remove document)
        // - If neither → don't send field (keep existing document unchanged)
        if (file) {
            formData.append('document', file);
        } else if (shouldRemoveDocument) {
            // Send empty file to explicitly remove document
            // Backend checks: if 'document' in form_data and not document.filename → remove
            const emptyFile = new File([], '', { type: 'application/octet-stream' });
            formData.append('document', emptyFile);
        }
        // If neither condition, document field is not sent - backend keeps existing document
        
        // Handle camera_captured_file field:
        // - If cameraFile provided → send file (upload/replace)
        // - If shouldRemoveCameraFile is true → send empty file with empty filename (remove camera file)
        // - If neither → don't send field (keep existing camera file unchanged)
        if (cameraFile) {
            formData.append('camera_captured_file', cameraFile);
        } else if (shouldRemoveCameraFile) {
            // Send empty file to explicitly remove camera file
            // Backend checks: if 'camera_captured_file' in form_data and not camera_captured_file.filename → remove
            const emptyCameraFile = new File([], '', { type: 'application/octet-stream' });
            formData.append('camera_captured_file', emptyCameraFile);
        }
        // If neither condition, camera_captured_file field is not sent - backend keeps existing camera file
        
        // galloInstance automatically handles FormData (doesn't set Content-Type)
        const response = await galloInstance(endpoints.attorneys.update(attorneyId), {
            method: 'PUT',
            body: formData,
        });
        console.log('Attorney update response:', response);
        return response;
    },

    // Delete attorney
    deleteAttorney: async (attorneyId) => {
        const response = await galloInstance(endpoints.attorneys.delete(attorneyId), {
            method: 'DELETE',
        });
        console.log('Attorney deletion response:', response);
        return response;
    },
};

