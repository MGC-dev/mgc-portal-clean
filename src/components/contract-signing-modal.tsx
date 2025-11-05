"use client";

import { useState, useEffect, useRef } from "react";
import { X, RefreshCw, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";

interface ContractSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractTitle: string;
  onSigningComplete?: () => void;
}

export function ContractSigningModal({
  isOpen,
  onClose,
  contractId,
  contractTitle,
  onSigningComplete,
}: ContractSigningModalProps) {
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  const [currentSignUrl, setCurrentSignUrl] = useState<string | undefined>(undefined);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [signingComplete, setSigningComplete] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && contractId) {
      createSigningRequest();
    }
  }, [isOpen, contractId]);

  // Start status checking when modal opens and URL is ready
  useEffect(() => {
    if (isOpen && currentSignUrl) {
      startStatusChecking();
    } else {
      stopStatusChecking();
    }

    return () => stopStatusChecking();
  }, [isOpen, currentSignUrl]);

  // Clean up on unmount
  useEffect(() => {
    return () => stopStatusChecking();
  }, []);

  const createSigningRequest = async () => {
    setLoading(true);
    setError(null);
    setCurrentSignUrl(undefined);

    try {
      const response = await fetch(`/api/contracts/${contractId}/start-sign`, {
        method: 'POST',
        headers: { 'accept': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.error || "Failed to start signing";
        const hint = data.hint ? `\nHint: ${data.hint}` : "";
        throw new Error(`${msg}${hint}`);
      }

      setCurrentSignUrl(data.url);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const startStatusChecking = () => {
    // Check status every 10 seconds
    statusCheckInterval.current = setInterval(async () => {
      await checkSigningStatus();
    }, 10000);
  };

  const stopStatusChecking = () => {
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
      statusCheckInterval.current = null;
    }
  };

  const checkSigningStatus = async () => {
    if (isCheckingStatus || signingComplete) return;

    try {
      setIsCheckingStatus(true);
      const response = await fetch(`/api/contracts/${contractId}/status`);
      const data = await response.json();

      if (data.signed) {
        setSigningComplete(true);
        stopStatusChecking();
        
        // Show success message briefly before closing
        setTimeout(() => {
          onSigningComplete?.();
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to check signing status:", error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const openInNewTab = () => {
    if (currentSignUrl) {
      window.open(currentSignUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleClose = () => {
    stopStatusChecking();
    setError(null);
    setSigningComplete(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Sign Contract</h2>
            {signingComplete && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Signing Complete!</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentSignUrl && (
              <button
                onClick={openInNewTab}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Contract Info */}
        <div className="px-4 py-2 bg-gray-50 border-b">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Contract:</span> {contractTitle}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 text-blue-600 animate-spin" />
                <p className="text-gray-600">Preparing signing session...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 bg-red-50 border-b">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
              <button
                onClick={createSigningRequest}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && currentSignUrl && (
            <div className="flex-1">
              {signingComplete ? (
                <div className="h-full flex items-center justify-center bg-green-50">
                  <div className="text-center">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
                    <h3 className="text-xl font-semibold text-green-800 mb-2">
                      Contract Signed Successfully!
                    </h3>
                    <p className="text-green-700">
                      The contract has been signed and saved. This window will close automatically.
                    </p>
                  </div>
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  src={currentSignUrl}
                  className="w-full h-full border-0"
                  title="Contract Signing Interface"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                  onLoad={() => {
                    // Start checking status more frequently once iframe loads
                    if (statusCheckInterval.current) {
                      clearInterval(statusCheckInterval.current);
                    }
                    statusCheckInterval.current = setInterval(checkSigningStatus, 5000);
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              {currentSignUrl && !signingComplete && (
                <p>Sign the document in the interface above. Status will update automatically.</p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}