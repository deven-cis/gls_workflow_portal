import { useParams, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

/**
 * Get effective job number from multiple sources
 * Priority: 1) prop, 2) query param (?jobId), 3) URL path param ([id])
 * 
 * @param {string|number|null} jobNoProp - Optional jobNo passed as prop
 * @returns {string|null} The effective job number
 */
export function useEffectiveJobNo(jobNoProp = null) {
    const params = useParams();
    const searchParams = useSearchParams();
    
    return useMemo(() => {
        // Priority 1: Use prop if provided
        if (jobNoProp) return String(jobNoProp);
        
        // Priority 2: Try query param
        const fromQuery = searchParams?.get('jobId');
        if (fromQuery) return fromQuery;
        
        // Priority 3: Fallback to URL path param
        return params?.id || null;
    }, [jobNoProp, params, searchParams]);
}

export default useEffectiveJobNo;
