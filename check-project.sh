#!/data/data/com.termux/files/usr/bin/bash
echo "====================="
echo "1. Checking 404 page fix..."
if grep -q "export const dynamic = 'force-dynamic';" app/not-found.js; then
  echo "✅ 404 page has force-dynamic"
else
  echo "❌ 404 page missing force-dynamic"
fi

echo "====================="
echo "2. Checking Public Layout (no Dashboard link)..."
if grep -q "Dashboard" app/layout.js; then
  echo "❌ Public layout still has Dashboard"
else
  echo "✅ Public layout has no Dashboard"
fi
if grep -q "AudioWaveformTrigger" app/layout.js; then
  echo "✅ Public layout has AudioWaveformTrigger"
else
  echo "❌ Public layout missing AudioWaveformTrigger"
fi

echo "====================="
echo "3. Checking Admin Layout (King Panel & Music)..."
if grep -q "King Panel" app/dashboard/layout.js; then
  echo "✅ Admin layout shows King Panel"
else
  echo "❌ Admin layout missing King Panel"
fi
if grep -q "MusicToggle" app/dashboard/layout.js; then
  echo "✅ Admin layout has MusicToggle"
else
  echo "❌ Admin layout missing MusicToggle"
fi

echo "====================="
echo "4. Checking Product Card..."
if [ -f components/organisms/ProductCard.jsx ]; then
  echo "✅ ProductCard exists"
  if grep -q "PLACEHOLDER" components/organisms/ProductCard.jsx; then
    echo "✅ ProductCard has placeholder image"
  else
    echo "❌ ProductCard missing placeholder"
  fi
else
  echo "❌ ProductCard file not found"
fi

echo "====================="
echo "5. Checking Crawler..."
if [ -f lib/crawler.js ]; then
  echo "✅ Crawler exists"
  if grep -q "p-limit" lib/crawler.js; then
    echo "✅ Crawler uses concurrency"
  else
    echo "❌ Crawler missing p-limit"
  fi
else
  echo "❌ Crawler file not found"
fi

echo "====================="
echo "6. Running Build..."
rm -rf .next
npm run build
if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
else
  echo "❌ Build failed. Please check errors above."
fi
