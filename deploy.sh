#!/bin/bash
# iDeploy - Personal iOS Deploy Tool
# Usage: ./deploy.sh [install|resign|block-apple|unblock-apple|status]

DEVICE_UDID="${DEVICE_UDID:-}"
APPLE_ID="${APPLE_ID:-}"
IPA_DIR="$HOME/.ideploy/ipas"
LOG_FILE="$HOME/.ideploy/deploy.log"
CERT_NAME="Apple Development"

mkdir -p "$IPA_DIR"
mkdir -p "$HOME/.ideploy"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ── FIND DEVICE ──────────────────────────────────────────────────────────────
find_device() {
  if command -v ios-deploy &>/dev/null; then
    ios-deploy --detect --timeout 3 2>/dev/null | grep -oE '[A-F0-9]{40}'| head -1
  else
    echo ""
  fi
}

# ── RESIGN IPA ───────────────────────────────────────────────────────────────
resign_ipa() {
  local IPA="$1"
  local OUT="${IPA%.ipa}_resigned.ipa"
  local TMPDIR=$(mktemp -d)

  log "Resigning: $IPA"

  cp "$IPA" "$TMPDIR/app.ipa"
  cd "$TMPDIR"
  unzip -q app.ipa -d app

  # Find .app bundle
  APP_PATH=$(find app/Payload -name "*.app" -maxdepth 1 | head -1)
  if [ -z "$APP_PATH" ]; then
    log "ERROR: No .app found in IPA"
    rm -rf "$TMPDIR"
    return 1
  fi

  BUNDLE_ID=$(defaults read "$APP_PATH/Info.plist" CFBundleIdentifier 2>/dev/null)
  log "Bundle ID: $BUNDLE_ID"

  # Get signing identity
  IDENTITY=$(security find-identity -v -p codesigning | grep "$CERT_NAME" | head -1 | awk '{print $2}')
  if [ -z "$IDENTITY" ]; then
    log "ERROR: No Apple Development certificate found. Run Xcode once with your Apple ID."
    rm -rf "$TMPDIR"
    return 1
  fi

  # Get provisioning profile for this bundle
  PROFILE=$(find "$HOME/Library/MobileDevice/Provisioning Profiles" -name "*.mobileprovision" | while read f; do
    BID=$(security cms -D -i "$f" 2>/dev/null | plutil -extract 'Entitlements.application-identifier' raw - 2>/dev/null | sed 's/.*\.//')
    [ "$BID" = "$BUNDLE_ID" ] && echo "$f" && break
  done)

  if [ -n "$PROFILE" ]; then
    cp "$PROFILE" "$APP_PATH/embedded.mobileprovision"
    log "Using existing provisioning profile"
  else
    log "WARNING: No matching provisioning profile found - attempting resign anyway"
  fi

  # Re-sign frameworks first
  find "$APP_PATH" -name "*.framework" -o -name "*.dylib" | while read f; do
    codesign -f -s "$IDENTITY" "$f" 2>/dev/null
  done

  # Re-sign main app
  codesign -f -s "$IDENTITY" --entitlements <(codesign -d --entitlements :- "$APP_PATH" 2>/dev/null) "$APP_PATH" 2>/dev/null

  # Repack
  cd app
  zip -qr "$OUT" Payload
  mv "$OUT" "$OLDPWD/../$(basename $OUT)"
  cd /
  rm -rf "$TMPDIR"

  log "Resigned IPA saved: $(basename $OUT)"
  echo "$(dirname $IPA)/$(basename $OUT)"
}

# ── INSTALL TO DEVICE ────────────────────────────────────────────────────────
install_ipa() {
  local IPA="$1"

  if ! command -v ios-deploy &>/dev/null; then
    log "ERROR: ios-deploy not found. Run: brew install ios-deploy"
    return 1
  fi

  UDID=$(find_device)
  if [ -z "$UDID" ]; then
    log "ERROR: No device found. Check USB/WiFi pairing."
    return 1
  fi

  log "Installing to device: $UDID"
  ios-deploy --bundle "$IPA" --id "$UDID" --justlaunch 2>&1 | tee -a "$LOG_FILE"
  log "Install complete"
}

# ── BLOCK APPLE VALIDATION DOMAINS ──────────────────────────────────────────
block_apple() {
  log "Blocking Apple validation domains via /etc/hosts"

  DOMAINS=(
    "ocsp.apple.com"
    "ocsp2.apple.com"
    "crl.apple.com"
    "valid.apple.com"
    "ppq.apple.com"
    "api.apple-cloudkit.com"
    "bag.itunes.apple.com"
    "init.itunes.apple.com"
    "xp.apple.com"
  )

  # Backup hosts file
  sudo cp /etc/hosts /etc/hosts.ideploy.bak

  for domain in "${DOMAINS[@]}"; do
    if ! grep -q "$domain" /etc/hosts; then
      echo "0.0.0.0 $domain" | sudo tee -a /etc/hosts > /dev/null
      log "Blocked: $domain"
    else
      log "Already blocked: $domain"
    fi
  done

  sudo dscacheutil -flushcache
  sudo killall -HUP mDNSResponder 2>/dev/null
  log "DNS cache flushed. Apple validation domains blocked."
}

# ── UNBLOCK APPLE DOMAINS ────────────────────────────────────────────────────
unblock_apple() {
  log "Restoring Apple domains..."
  if [ -f /etc/hosts.ideploy.bak ]; then
    sudo cp /etc/hosts.ideploy.bak /etc/hosts
    sudo dscacheutil -flushcache
    sudo killall -HUP mDNSResponder 2>/dev/null
    log "Restored from backup"
  else
    log "No backup found - removing entries manually"
    sudo sed -i '' '/ocsp.apple.com\|crl.apple.com\|valid.apple.com\|ppq.apple.com/d' /etc/hosts
  fi
}

# ── STATUS ───────────────────────────────────────────────────────────────────
status() {
  echo "── iDeploy Status ──────────────────────────"
  
  # Device
  UDID=$(find_device)
  [ -n "$UDID" ] && echo "📱 Device: $UDID" || echo "📱 Device: Not found"

  # ios-deploy
  command -v ios-deploy &>/dev/null && echo "✅ ios-deploy: installed" || echo "❌ ios-deploy: missing (brew install ios-deploy)"

  # Cert
  CERT=$(security find-identity -v -p codesigning | grep "Apple Development" | head -1 | sed 's/.*"\(.*\)"/\1/')
  [ -n "$CERT" ] && echo "🔐 Certificate: $CERT" || echo "❌ Certificate: None found"

  # Apple blocking
  grep -q "ocsp.apple.com" /etc/hosts && echo "🚫 Apple validation: BLOCKED" || echo "✅ Apple validation: Active"

  # IPAs
  IPA_COUNT=$(find "$IPA_DIR" -name "*.ipa" 2>/dev/null | wc -l | tr -d ' ')
  echo "📦 Managed IPAs: $IPA_COUNT"
  echo "────────────────────────────────────────────"
}

# ── ENTRY POINT ──────────────────────────────────────────────────────────────
case "$1" in
  install)    resign_ipa "$2" && install_ipa "$(dirname $2)/$(basename ${2%.ipa})_resigned.ipa" ;;
  resign)     resign_ipa "$2" ;;
  block)      block_apple ;;
  unblock)    unblock_apple ;;
  status)     status ;;
  *)
    echo "iDeploy - Personal iOS Deploy Tool"
    echo ""
    echo "Usage:"
    echo "  ./deploy.sh status              — check everything"
    echo "  ./deploy.sh resign <app.ipa>    — re-sign IPA only"
    echo "  ./deploy.sh install <app.ipa>   — resign + push to device"
    echo "  ./deploy.sh block               — block Apple validation domains"
    echo "  ./deploy.sh unblock             — restore Apple domains"
    ;;
esac
