/**
 * Enhanced error handling for Supabase Edge Function calls
 */

interface EdgeFunctionError {
  name: string;
  message: string;
  cause?: any;
  stack?: string;
}

export const handleEdgeFunctionError = (error: any, functionName: string) => {
  console.error(`❌ [${functionName}] Edge Function Error:`, error);
  
  // Extract meaningful error information
  let errorInfo: EdgeFunctionError = {
    name: error.name || 'EdgeFunctionError',
    message: error.message || 'Unknown edge function error'
  };

  // Handle common error types
  if (error.name === 'FunctionsFetchError') {
    errorInfo.message = `Failed to reach ${functionName} Edge Function. This could be due to:
- Function not deployed or accessible
- Network connectivity issues
- CORS configuration problems
- Authentication issues`;
  }

  if (error.message?.includes('Failed to send a request')) {
    errorInfo.message = `Request to ${functionName} failed. Possible causes:
- Edge Function not deployed
- Invalid Supabase configuration
- Network timeout or connectivity issues`;
  }

  if (error.message?.includes('404')) {
    errorInfo.message = `Edge Function '${functionName}' not found. Available functions may not include this one.`;
  }

  // Log detailed debug information
  console.log('🔍 [DEBUG] Error details:', {
    functionName,
    errorType: error.constructor.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause
  });

  return errorInfo;
};

export const createFallbackResponse = (functionName: string, fallbackMessage?: string) => {
  return {
    content: fallbackMessage || `I apologize, but the ${functionName} service is currently unavailable. Please try again later or contact support if the issue persists.`,
    error: `${functionName} service unavailable`,
    workflowGenerated: false
  };
};

// Test function accessibility
export const testEdgeFunctionAccess = async (functionName: string, testPayload: any = {}) => {
  try {
    const { supabase } = await import('./supabase');
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: testPayload
    });

    return {
      accessible: !error,
      error: error?.message,
      data,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      accessible: false,
      error: error.message,
      data: null,
      timestamp: new Date().toISOString()
    };
  }
};
