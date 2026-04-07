#!/usr/bin/env python3
"""Patch Info.plist to add HealthKit usage description."""
import plistlib
import sys

def patch(path):
    with open(path, 'rb') as f:
        plist = plistlib.load(f)

    if 'NSHealthShareUsageDescription' in plist and 'NSHealthUpdateUsageDescription' in plist:
        print("  Already patched, skipping.")
        return

    plist['NSHealthShareUsageDescription'] = '러닝 거리를 자동으로 기록하기 위해 건강 데이터에 접근합니다.'
    plist['NSHealthUpdateUsageDescription'] = '러닝 기록을 건강 앱에 저장하기 위해 접근합니다.'

    # Add healthkit to required device capabilities
    capabilities = plist.get('UIRequiredDeviceCapabilities', [])
    if 'healthkit' not in capabilities:
        capabilities.append('healthkit')
        plist['UIRequiredDeviceCapabilities'] = capabilities

    with open(path, 'wb') as f:
        plistlib.dump(plist, f)

    print("  Patched successfully.")

if __name__ == '__main__':
    patch(sys.argv[1])
