<img src="icon.png" width="200" alt="iDeploy Icon" />

# iDeploy

**Rapid iOS Deployment & Apple Validation Blocker — v1.0**

Free. Open-source. No subscriptions. No telemetry. Built by [MDRN Corp](https://mdrn.app).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Platform: macOS](https://img.shields.io/badge/Platform-macOS-lightgrey.svg)](https://apple.com/macos)
[![Release](https://img.shields.io/github/v/release/ghostintheprompt/ideploy.svg)](https://github.com/ghostintheprompt/ideploy/releases)

---

It essentially turns your Mac into a private signing and deployment server. You use the command line for the heavy lifting and keep `iDeploy.html` open in your browser just to watch the logs and confirm the device is responding. No subscriptions, no revoked certificates, no bloat.

## Quick Start

```bash
git clone https://github.com/ghostintheprompt/ideploy.git && cd ideploy && ./setup.sh
./deploy.sh install YourApp.ipa
```

## Features

| Feature | Description |
| :--- | :--- |
| **Local Deploy** | Pushes to your device over WiFi via `ios-deploy` |
| **Resign IPAs** | Re-signs your IPA using your free Apple ID cert |
| **Domain Block** | Blocks Apple validation domains via `/etc/hosts` so expiry checks never happen |
| **Web Hub** | View system activity from your browser |
| **Update Check** | Silent update checker for new releases via GitHub API |

## Installation

### 1. DMG Download (Recommended)
Download the latest `iDeploy_v1.0.0.dmg` from the [Releases](https://github.com/ghostintheprompt/ideploy/releases) page and copy the folder to your Applications.

### 2. Homebrew (Cask)
*(Pending tap approval)*
```bash
brew install --cask ghostintheprompt/tap/ideploy
```

### 3. Build from Source
```bash
git clone https://github.com/ghostintheprompt/ideploy.git
cd ideploy
chmod +x setup.sh deploy.sh
./setup.sh
```

## Usage

```bash
# Check everything is working
./deploy.sh status

# Block Apple validation (do this once, leave it on)
./deploy.sh block

# Resign + deploy your IPA
./deploy.sh install MyGame.ipa

# Just resign without installing
./deploy.sh resign MyGame.ipa

# Start the Web Hub
./deploy.sh serve

# Restore Apple domains if needed
./deploy.sh unblock
```

*If you're baked, it's still easy to run—even on Kashmiri.*

## Privacy

**100% Local. Zero Telemetry.**
iDeploy runs entirely on your machine. It makes zero analytics calls, collects no usage data, and routes no traffic outside of your local network, with the sole exception of a lightweight GitHub API check to see if a new version is available.

---

Built by **MDRN Corp** — [ghostintheprompt.com](https://ghostintheprompt.com/articles/spectral-cyclops)
