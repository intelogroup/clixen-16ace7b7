import { useEffect, useCallback, useRef } from 'react';

export interface PerformanceMetrics {
  componentName: string;
  mountTime: number;
  renderTime: number;
  updateCount: number;
  memoryUsage?: number;
}

export const usePerformance = (componentName: string) => {
  const mountTimeRef = useRef<number>(performance.now());
  const renderCountRef = useRef<number>(0);
  const lastRenderRef = useRef<number>(performance.now());

  const measureRender = useCallback(() => {
    const now = performance.now();
    const renderTime = now - lastRenderRef.current;
    renderCountRef.current += 1;
    lastRenderRef.current = now;

    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(`⚠️ Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }

    return renderTime;
  }, [componentName]);

  const getMetrics = useCallback((): PerformanceMetrics => {
    const now = performance.now();
    const mountTime = now - mountTimeRef.current;
    
    let memoryUsage: number | undefined;
    if ('memory' in performance) {
      memoryUsage = (performance as any).memory?.usedJSHeapSize;
    }

    return {
      componentName,
      mountTime,
      renderTime: now - lastRenderRef.current,
      updateCount: renderCountRef.current,
      memoryUsage
    };
  }, [componentName]);

  const reportMetrics = useCallback(() => {
    const metrics = getMetrics();
    
    if (process.env.NODE_ENV === 'development') {
      console.group(`📊 Performance Metrics: ${componentName}`);
      console.log(`Mount time: ${metrics.mountTime.toFixed(2)}ms`);
      console.log(`Render count: ${metrics.updateCount}`);
      console.log(`Last render: ${metrics.renderTime.toFixed(2)}ms`);
      if (metrics.memoryUsage) {
        console.log(`Memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      }
      console.groupEnd();
    }

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      // analytics.track('component_performance', metrics);
    }

    return metrics;
  }, [componentName, getMetrics]);

  // Track component lifecycle
  useEffect(() => {
    measureRender();
  });

  // Cleanup and final report on unmount
  useEffect(() => {
    return () => {
      if (renderCountRef.current > 0) {
        reportMetrics();
      }
    };
  }, [reportMetrics]);

  return {
    measureRender,
    getMetrics,
    reportMetrics
  };
};

// Hook for tracking async operations performance
export const useAsyncPerformance = () => {
  const measureAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
      }
      
      // Report to analytics
      if (process.env.NODE_ENV === 'production') {
        // analytics.track('async_operation_performance', {
        //   operationName,
        //   duration,
        //   success: true
        // });
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ ${operationName} failed after ${duration.toFixed(2)}ms:`, error);
      }
      
      // Report failure to analytics
      if (process.env.NODE_ENV === 'production') {
        // analytics.track('async_operation_performance', {
        //   operationName,
        //   duration,
        //   success: false,
        //   error: error.message
        // });
      }
      
      throw error;
    }
  }, []);

  return { measureAsync };
};

// Hook for tracking user interactions
export const useInteractionPerformance = () => {
  const measureInteraction = useCallback((
    interactionName: string,
    callback: () => void | Promise<void>
  ) => {
    return async (event?: React.SyntheticEvent) => {
      const startTime = performance.now();
      
      try {
        await callback();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (process.env.NODE_ENV === 'development' && duration > 100) {
          console.warn(`🐌 Slow interaction ${interactionName}: ${duration.toFixed(2)}ms`);
        }
        
        // Report to analytics
        if (process.env.NODE_ENV === 'production') {
          // analytics.track('user_interaction_performance', {
          //   interactionName,
          //   duration
          // });
        }
      } catch (error) {
        console.error(`❌ Interaction ${interactionName} failed:`, error);
      }
    };
  }, []);

  return { measureInteraction };
};

export default usePerformance;