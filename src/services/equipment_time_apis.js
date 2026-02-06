import { galloInstance } from './galloInstance.js';
import { endpoints } from '@/constants/endpoints';

// Helper function to build FormData for equipment time (shared between create and update)
const buildEquipmentTimeFormData = (equipmentInfo, jobNo = null, cameraFile = null) => {
    const formData = new FormData();
    
    if (jobNo) {
        formData.append('job_no', jobNo);
    }
    
    formData.append('laptop_used', equipmentInfo.laptopUsed ? 'true' : 'false');
    formData.append('pip_used', equipmentInfo.pipUsed ? 'true' : 'false');
    formData.append('exhibit_tech', equipmentInfo.exhibitTech ? 'true' : 'false');

    if (equipmentInfo.parkingCost) {
        formData.append('parking_cost', equipmentInfo.parkingCost);
    }
    if (equipmentInfo.timeAfterFive) {
        formData.append('time_after', equipmentInfo.timeAfterFive);
    }
    console.log('equipmentInfo for equipment time', equipmentInfo);
    // Attach new/additional documents (files that have File objects)
    (equipmentInfo.documents || []).forEach((doc) => {
        console.log('doc for equipment time', doc);
        if (doc.file) {
            formData.append('files', doc.file);
        }
    });

    // Attach camera-captured image if provided
    if (cameraFile) {
        formData.append('camera_captured_file', cameraFile);
    }

    console.log('formData for equipment time', formData);
    return formData;
};

export const equipmentTimeAPI = {
    // Get equipment time information for a job by job_no
    // Backend endpoint: GET /equipment-time/get/{job_no}
    // Returns null if equipment time doesn't exist (404) or backend error (500) - handles gracefully
    getJobEquipmentTime: async (jobNo) => {
        try {
            const response = await galloInstance(endpoints.equipmentTime.get(jobNo));
            return response?.result || null;
        } catch (err) {
            // Handle 404 as "no equipment time found" - not an error, just means equipment time hasn't been created yet
            if (err?.status === 404 || 
                err?.message?.includes('404') || 
                err?.message?.includes('not found') ||
                err?.message?.includes('Equipment time for job_no')) {
                console.log(`No equipment time found for job ${jobNo} - this is expected for new jobs`);
                return null;
            }
            // Handle 500 errors (like Decimal serialization issues) - treat as no data found
            if (err?.status === 500 || 
                err?.message?.includes('500') ||
                err?.message?.includes('Decimal is not JSON serializable') ||
                err?.message?.includes('Failed to get equipment_time')) {
                console.warn(`Backend error fetching equipment time for job ${jobNo} - treating as no data:`, err?.message);
                return null;
            }
            // Re-throw other errors (network errors, etc.)
            console.error('Error fetching equipment time data:', err);
            throw err;
        }
    },

    // Create equipment time information for a job
    // Backend endpoint: POST /equipment-time/create
    createEquipmentTime: async (jobNo, equipmentInfo, cameraFile = null) => {
        const formData = buildEquipmentTimeFormData(equipmentInfo, jobNo, cameraFile);
        return galloInstance(endpoints.equipmentTime.create(), {
            method: 'POST',
            body: formData,
        });
    },

    // Update equipment time information - only sends changed fields
    // Backend endpoint: PUT /equipment-time/update/{equipment_time_id}
    updateEquipmentTime: async (equipmentTimeId, equipmentInfo, originalEquipmentInfo, jobNo = null, cameraFile = null, shouldRemoveCameraFile = false) => {
        const formData = new FormData();
        
        if (jobNo) {
            formData.append('job_no', jobNo);
        }
        
        // Only send fields that have changed
        if (equipmentInfo.laptopUsed !== originalEquipmentInfo?.laptopUsed) {
            formData.append('laptop_used', equipmentInfo.laptopUsed ? 'true' : 'false');
        }
        
        if (equipmentInfo.pipUsed !== originalEquipmentInfo?.pipUsed) {
            formData.append('pip_used', equipmentInfo.pipUsed ? 'true' : 'false');
        }
        
        if (equipmentInfo.exhibitTech !== originalEquipmentInfo?.exhibitTech) {
            formData.append('exhibit_tech', equipmentInfo.exhibitTech ? 'true' : 'false');
        }
        
        if (equipmentInfo.parkingCost !== originalEquipmentInfo?.parkingCost) {
            formData.append('parking_cost', equipmentInfo.parkingCost || '');
        }
        
        if (equipmentInfo.timeAfterFive !== originalEquipmentInfo?.timeAfterFive) {
            formData.append('time_after', equipmentInfo.timeAfterFive || '');
        }

        // Handle new documents (files that have File objects - these are new uploads)
        (equipmentInfo.documents || []).forEach((doc) => {
            if (doc.file) {
                formData.append('files', doc.file);
            }
        });
        
        // Handle document removal - send list of document IDs to remove
        if (equipmentInfo.documentsToRemove && equipmentInfo.documentsToRemove.length > 0) {
            equipmentInfo.documentsToRemove.forEach((docId) => {
                formData.append('remove_documents', docId.toString());
            });
        }

        // Handle camera-captured image
        if (cameraFile) {
            formData.append('camera_captured_file', cameraFile);
        } else if (shouldRemoveCameraFile) {
            const emptyCameraFile = new File([], '', { type: 'application/octet-stream' });
            formData.append('camera_captured_file', emptyCameraFile);
        }

        return galloInstance(endpoints.equipmentTime.update(equipmentTimeId), {
            method: 'PUT',
            body: formData,
        });
    },

    // Delete equipment time information
    // Backend endpoint: DELETE /equipment-time/delete/{equipment_time_id}
    deleteEquipmentTime: async (equipmentTimeId) => {
        const response = await galloInstance(endpoints.equipmentTime.delete(equipmentTimeId), {
            method: 'DELETE',
        });
        return response;
    },
};

