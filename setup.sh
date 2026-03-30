#!/bin/bash
# iDeploy Setup - Run once to get everything ready

echo "── iDeploy Setup ────────────────────────────"

# Check Homebrew
if ! command -v brew &>/dev/null; then
  echo "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install ios-deploy
if ! command -v ios-deploy &>/dev/null; then
  echo "Installing ios-deploy..."
  brew install ios-deploy
else
  echo "✅ ios-deploy already installed"
fi

# Create config
mkdir -p "$HOME/.ideploy/ipas"
CONFIG="$HOME/.ideploy/config"

if [ ! -f "$CONFIG" ]; then
  cat > "$CONFIG" <<EOF
# iDeploy Config
# Your device UDID (leave blank to auto-detect)
DEVICE_UDID=

# Path to your IPA files
IPA_DIR=$HOME/.ideploy/ipas
EOF
  echo "✅ Config created at $CONFIG"
fi

# Check for Apple Development cert
CERT=$(security find-identity -v -p codesigning | grep "Apple Development" | head -1)
if [ -z "$CERT" ]; then
  echo ""
  echo "⚠️  No Apple Development certificate found."
  echo "   Open Xcode → Settings → Accounts → Add your Apple ID"
  echo "   Then open any project and let Xcode create the cert once."
  echo "   After that you never need to touch Xcode again."
else
  echo "✅ Certificate found: $(echo $CERT | sed 's/.*"\(.*\)"/\1/')"
fi

# Make deploy script executable
chmod +x "$(dirname $0)/deploy.sh"

echo ""
echo "── Setup Complete ───────────────────────────"
echo "Run ./deploy.sh status to verify everything"
echo "Run ./deploy.sh block to block Apple validation"
echo "Run ./deploy.sh install YourApp.ipa to deploy"
