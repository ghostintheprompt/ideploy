# iDeploy
A rapid iOS deployment tool that blocks Apple validation domains and tracks provisioning expiry.

## Features
- **Re-signs IPAs** using your free Apple ID
- **Deploys locally** over WiFi via `ios-deploy`
- **Blocks Apple domains** via `/etc/hosts` to stop expiry checks
- **Live testing hub** served via local web UI

## Requirements
- macOS 12+
- Xcode (free)
- `ios-deploy` (`brew install ios-deploy`)
- `fswatch` and `qrencode` (installed via setup)

## Installation
### Option 1: DMG (Recommended)
Download the latest DMG from the Releases page, copy the `iDeploy` folder to your Applications or preferred directory.

### Option 2: Build from Source
```bash
git clone https://github.com/ghostintheprompt/ideploy.git
cd ideploy
chmod +x setup.sh deploy.sh
./setup.sh
```

## First Launch
You must run `setup.sh` to install necessary dependencies and configure your environment.
Make sure you have logged into Xcode at least once with your Apple ID so your Mac has an Apple Development certificate.

## Troubleshooting
- **No certificate found**: Open Xcode → Settings → Accounts, and add your Apple ID. Create an empty project and run it once on your device to generate the free cert.
- **ios-deploy errors**: Ensure your device is trusted by your Mac and on the same WiFi network, or connected via USB.

## Usage
```bash
# Check status
./deploy.sh status

# Block Apple validation
./deploy.sh block

# Install an IPA
./deploy.sh install YourApp.ipa

# Start the Web Hub
./deploy.sh serve
```