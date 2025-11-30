import { toast } from "sonner";
import type { ApiError } from "@/types/api";

/**
 * Check if an error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof (error as ApiError).detail === "string"
  );
}

/**
 * Get a user-friendly message from an error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.detail;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

/**
 * Show an error toast notification
 */
export function showErrorToast(error: unknown, title?: string): void {
  const message = getErrorMessage(error);
  toast.error(title || "Error", {
    description: message,
  });
}

/**
 * Show a success toast notification
 */
export function showSuccessToast(message: string, title?: string): void {
  toast.success(title || "Success", {
    description: message,
  });
}

/**
 * Show an info toast notification
 */
export function showInfoToast(message: string, title?: string): void {
  toast.info(title || "Info", {
    description: message,
  });
}

/**
 * Handle an API call with automatic error toast
 */
export async function handleApiCall<T>(
  apiCall: () => Promise<T>,
  options?: {
    errorTitle?: string;
    successMessage?: string;
    successTitle?: string;
  }
): Promise<T | null> {
  try {
    const result = await apiCall();
    if (options?.successMessage) {
      showSuccessToast(options.successMessage, options.successTitle);
    }
    return result;
  } catch (error) {
    showErrorToast(error, options?.errorTitle);
    return null;
  }
}
