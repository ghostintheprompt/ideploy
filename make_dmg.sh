#!/bin/bash
# make_dmg.sh - Build a DMG for iDeploy

APP_NAME="iDeploy"
VERSION="1.0.0"
DMG_NAME="${APP_NAME}_v${VERSION}.dmg"
STAGING_DIR="build_dmg"

# Clean up previous builds
rm -rf "$STAGING_DIR" "$DMG_NAME"
mkdir -p "$STAGING_DIR/$APP_NAME/lib"

# Copy files
cp README.md "$STAGING_DIR/$APP_NAME/"
cp BUILD.md "$STAGING_DIR/$APP_NAME/"
cp iDeploy.html "$STAGING_DIR/$APP_NAME/"
cp deploy.sh "$STAGING_DIR/$APP_NAME/"
cp setup.sh "$STAGING_DIR/$APP_NAME/"
cp lib/live-reload.js "$STAGING_DIR/$APP_NAME/lib/"
cp lib/server.js "$STAGING_DIR/$APP_NAME/lib/"
if [ -f "icon.png" ]; then
  cp icon.png "$STAGING_DIR/$APP_NAME/"
fi

# Set executable permissions
chmod +x "$STAGING_DIR/$APP_NAME/deploy.sh" "$STAGING_DIR/$APP_NAME/setup.sh"

# Create DMG
hdiutil create -volname "$APP_NAME" -srcfolder "$STAGING_DIR" -ov -format UDZO "$DMG_NAME"

# Clean up
rm -rf "$STAGING_DIR"

echo "✅ Created $DMG_NAME"
