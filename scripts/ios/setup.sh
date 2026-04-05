#!/bin/bash
# iOS 프로젝트 초기 설정 스크립트
# npx cap add ios 후 실행

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IOS_APP="$PROJECT_ROOT/ios/App/App"

echo "=== iOS 프로젝트 설정 ==="

# 1. HealthKit 플러그인 소스 복사
echo "→ HealthKit 플러그인 복사..."
mkdir -p "$IOS_APP/Plugins/CapacitorHealthkit"
cp "$PROJECT_ROOT/node_modules/@perfood/capacitor-healthkit/ios/Plugin/CapacitorHealthkitPlugin.swift" \
   "$IOS_APP/Plugins/CapacitorHealthkit/"
cp "$PROJECT_ROOT/node_modules/@perfood/capacitor-healthkit/ios/Plugin/CapacitorHealthkitPlugin.m" \
   "$IOS_APP/Plugins/CapacitorHealthkit/"

# 2. App.entitlements 생성
echo "→ App.entitlements 생성..."
cat > "$IOS_APP/App.entitlements" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.healthkit</key>
	<true/>
	<key>com.apple.developer.healthkit.access</key>
	<array/>
</dict>
</plist>
EOF

# 3. Info.plist에 HealthKit 권한 설명 추가
echo "→ Info.plist 업데이트..."
if ! grep -q "NSHealthShareUsageDescription" "$IOS_APP/Info.plist"; then
  sed -i '' 's|<key>UIViewControllerBasedStatusBarAppearance</key>|<key>UIViewControllerBasedStatusBarAppearance</key>\
	<true/>\
	<key>NSHealthShareUsageDescription</key>\
	<string>러닝 거리를 자동으로 기록하기 위해 건강 데이터에 접근합니다.</string>|' "$IOS_APP/Info.plist"
fi

# 4. project.pbxproj 패치 — 플러그인 파일, entitlements, signing team 추가
echo "→ Xcode 프로젝트 설정 패치..."
PBXPROJ="$PROJECT_ROOT/ios/App/App.xcodeproj/project.pbxproj"

python3 "$SCRIPT_DIR/patch_pbxproj.py" "$PBXPROJ"

echo "=== iOS 설정 완료 ==="
