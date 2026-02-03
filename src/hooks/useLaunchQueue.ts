import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface LaunchFile {
  name: string;
  type: string;
  file: File;
}

interface LaunchParams {
  files: LaunchFile[];
  targetURL: string | null;
}

/**
 * Hook for handling Launch Queue API (PWA 2025)
 * Handles files opened via file_handlers and protocol_handlers
 */
export function useLaunchQueue() {
  const navigate = useNavigate();
  const [launchParams, setLaunchParams] = useState<LaunchParams | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const isSupported = 'launchQueue' in window;

  const processLaunchFiles = useCallback(async (fileHandles: FileSystemFileHandle[]) => {
    const files: LaunchFile[] = [];
    
    for (const handle of fileHandles) {
      try {
        const file = await handle.getFile();
        files.push({
          name: file.name,
          type: file.type,
          file,
        });
      } catch (error) {
        console.error('[Launch Queue] Error reading file:', error);
      }
    }
    
    return files;
  }, []);

  useEffect(() => {
    if (!isSupported) {
      console.log('[Launch Queue] Not supported in this browser');
      return;
    }

    interface LaunchQueueParams {
      files?: FileSystemFileHandle[];
      targetURL?: string;
    }

    const launchQueue = (window as unknown as { launchQueue: { setConsumer: (cb: (params: LaunchQueueParams) => void) => void } }).launchQueue;
    
    launchQueue.setConsumer(async (params: LaunchQueueParams) => {
      setIsProcessing(true);
      console.log('[Launch Queue] Received launch params:', params);
      
      try {
        const files = params.files?.length 
          ? await processLaunchFiles(params.files) 
          : [];
        
        const targetURL = params.targetURL || null;
        
        setLaunchParams({ files, targetURL });
        
        // Auto-navigate if files were opened
        if (files.length > 0) {
          // Store files in sessionStorage for the handler page
          sessionStorage.setItem('launchFiles', JSON.stringify(
            files.map(f => ({ name: f.name, type: f.type }))
          ));
          navigate('/open-file', { state: { files } });
        } else if (targetURL) {
          // Navigate to target URL if provided
          const url = new URL(targetURL);
          navigate(url.pathname + url.search);
        }
      } catch (error) {
        console.error('[Launch Queue] Error processing:', error);
      } finally {
        setIsProcessing(false);
      }
    });

    console.log('[Launch Queue] Consumer registered');
  }, [isSupported, navigate, processLaunchFiles]);

  const clearLaunchParams = useCallback(() => {
    setLaunchParams(null);
    sessionStorage.removeItem('launchFiles');
  }, []);

  return {
    isSupported,
    launchParams,
    isProcessing,
    clearLaunchParams,
  };
}
