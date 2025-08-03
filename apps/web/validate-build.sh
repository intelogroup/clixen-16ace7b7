#!/bin/bash
# Build validation script to prevent placeholder URL issues

echo "🔍 Validating Clixen build for production readiness..."

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ dist/ directory not found. Run 'pnpm run build' first."
    exit 1
fi

# Check for placeholder URLs
PLACEHOLDER_COUNT=$(grep -r "your-project.supabase.co" dist/ 2>/dev/null | wc -l)
if [ $PLACEHOLDER_COUNT -gt 0 ]; then
    echo "❌ FAILED: Found $PLACEHOLDER_COUNT placeholder URLs in build:"
    grep -r "your-project.supabase.co" dist/
    echo ""
    echo "🔧 Fix: Ensure VITE_SUPABASE_URL is set correctly during build"
    exit 1
fi

# Check for real Supabase URL
REAL_URL_COUNT=$(grep -r "zfbgdixbzezpxllkoyfc.supabase.co" dist/ 2>/dev/null | wc -l)
if [ $REAL_URL_COUNT -eq 0 ]; then
    echo "❌ FAILED: Real Supabase URL not found in build"
    echo "🔧 Fix: Verify VITE_SUPABASE_URL environment variable"
    exit 1
fi

# Check for placeholder API keys
PLACEHOLDER_KEY_COUNT=$(grep -r "your-anon-key" dist/ 2>/dev/null | wc -l)
if [ $PLACEHOLDER_KEY_COUNT -gt 0 ]; then
    echo "❌ FAILED: Found placeholder API keys in build"
    exit 1
fi

echo "✅ BUILD VALIDATION PASSED!"
echo "📊 Found $REAL_URL_COUNT references to production Supabase URL"
echo "🚀 Build is ready for production deployment"