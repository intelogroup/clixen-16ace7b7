import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Zap } from 'lucide-react';
import { Button, designTokens } from '../components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ 
                backgroundColor: designTokens.colors.primary[500],
                color: designTokens.colors.white
              }}
            >
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              clixen<span className="text-gray-500">.ai</span>
            </span>
          </Link>
        </div>
        
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page not found</h2>
          <p className="text-gray-600 leading-relaxed">
            Sorry, we couldn't find the page you're looking for. 
            It might have been moved, deleted, or you entered the wrong URL.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button
            as="a"
            href="/dashboard"
            variant="primary"
            size="lg"
            leftIcon={<Home className="w-4 h-4" />}
          >
            Go to Dashboard
          </Button>
          
          <div>
            <Button
              onClick={() => window.history.back()}
              variant="ghost"
              size="md"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Go back
            </Button>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-200 text-sm text-gray-500">
          Need help? <a href="#" className="text-black hover:underline">Contact support</a>
        </div>
      </div>
    </div>
  );
}
