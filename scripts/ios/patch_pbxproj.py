#!/usr/bin/env python3
"""Patch project.pbxproj to add HealthKit framework, entitlements, and signing."""
import sys
import os

def patch(path):
    with open(path, 'r') as f:
        content = f.read()

    # Skip if already patched
    if 'App.entitlements' in content:
        print("  Already patched, skipping.")
        return

    # 1. Add HealthKit.framework file reference and build file
    content = content.replace(
        '/* End PBXBuildFile section */',
        '\t\tA1B2C3D401000005000000AA /* HealthKit.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = A1B2C3D401000006000000AA /* HealthKit.framework */; };\n'
        '/* End PBXBuildFile section */'
    )

    content = content.replace(
        '/* End PBXFileReference section */',
        '\t\tA1B2C3D401000006000000AA /* HealthKit.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = HealthKit.framework; path = System/Library/Frameworks/HealthKit.framework; sourceTree = SDKROOT; };\n'
        '\t\tA1B2C3D401000007000000AA /* App.entitlements */ = {isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = App.entitlements; sourceTree = "<group>"; };\n'
        '/* End PBXFileReference section */'
    )

    # 2. Add HealthKit.framework to Frameworks build phase
    content = content.replace(
        '/* CapApp-SPM in Frameworks */,\n\t\t\t\t);',
        '/* CapApp-SPM in Frameworks */,\n\t\t\t\t\tA1B2C3D401000005000000AA /* HealthKit.framework in Frameworks */,\n\t\t\t\t);'
    )

    # 3. Add entitlements to App group children
    content = content.replace(
        '50B271D01FEDC1A000F3C39B /* public */,\n\t\t\t);\n\t\t\tpath = App;',
        '50B271D01FEDC1A000F3C39B /* public */,\n'
        '\t\t\t\tA1B2C3D401000007000000AA /* App.entitlements */,\n'
        '\t\t\t);\n\t\t\tpath = App;'
    )

    # 4. Add DEVELOPMENT_TEAM and CODE_SIGN_ENTITLEMENTS to Debug config
    team_id = os.environ.get('TEAM_ID', 'EHQP3GVR66')

    # Debug target config
    content = content.replace(
        'CODE_SIGN_STYLE = Automatic;\n\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n\t\t\t\tINFOPLIST_FILE = App/Info.plist;\n\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 15.0;\n\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (\n\t\t\t\t\t"$(inherited)",\n\t\t\t\t\t"@executable_path/Frameworks",\n\t\t\t\t);\n\t\t\t\tMARKETING_VERSION = 1.0;\n\t\t\t\tOTHER_SWIFT_FLAGS',
        f'CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\tCODE_SIGN_STYLE = Automatic;\n\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n\t\t\t\tDEVELOPMENT_TEAM = {team_id};\n\t\t\t\tINFOPLIST_FILE = App/Info.plist;\n\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 15.0;\n\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (\n\t\t\t\t\t"$(inherited)",\n\t\t\t\t\t"@executable_path/Frameworks",\n\t\t\t\t);\n\t\t\t\tMARKETING_VERSION = 1.0;\n\t\t\t\tOTHER_SWIFT_FLAGS'
    )

    # Release target config
    content = content.replace(
        'CODE_SIGN_STYLE = Automatic;\n\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n\t\t\t\tINFOPLIST_FILE = App/Info.plist;\n\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 15.0;\n\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (\n\t\t\t\t\t"$(inherited)",\n\t\t\t\t\t"@executable_path/Frameworks",\n\t\t\t\t);\n\t\t\t\tMARKETING_VERSION = 1.0;\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER',
        f'CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\tCODE_SIGN_STYLE = Automatic;\n\t\t\t\tCURRENT_PROJECT_VERSION = 1;\n\t\t\t\tDEVELOPMENT_TEAM = {team_id};\n\t\t\t\tINFOPLIST_FILE = App/Info.plist;\n\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 15.0;\n\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (\n\t\t\t\t\t"$(inherited)",\n\t\t\t\t\t"@executable_path/Frameworks",\n\t\t\t\t);\n\t\t\t\tMARKETING_VERSION = 1.0;\n\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER'
    )

    with open(path, 'w') as f:
        f.write(content)

    print("  Patched successfully.")

if __name__ == '__main__':
    patch(sys.argv[1])
