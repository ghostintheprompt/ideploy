# iDeploy — Personal iOS Deploy Tool

Your device. Your rules.

## What This Does

- **Re-signs your IPA** using your free Apple ID cert
- **Pushes to your device** over WiFi via ios-deploy
- **Blocks Apple validation domains** via /etc/hosts so expiry checks never happen
- **Tracks expiry** and auto re-signs before it hits

## Setup (One Time)

```bash
chmod +x setup.sh deploy.sh
./setup.sh
```

You need Xcode installed with your Apple ID added once under:
`Xcode → Settings → Accounts`
That's the only time you touch Xcode.

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

# Restore Apple domains if needed
./deploy.sh unblock
```

## The UI

Open `iDeploy.html` in any browser for the visual interface.
Drag and drop IPAs, toggle blocking, one-click deploy.

## How the Blocking Works

Adds these to `/etc/hosts` → `0.0.0.0`:
- ocsp.apple.com
- ocsp2.apple.com  
- crl.apple.com
- valid.apple.com
- ppq.apple.com
- And 4 more Apple validation endpoints

Your test device on the same network routes through your Mac's DNS — no validation calls ever reach Apple.

## Requirements

- macOS 12+
- Xcode (free)
- ios-deploy (`brew install ios-deploy`)
- Your iPhone trusted on your Mac (one USB connection)
- Free Apple ID

## Notes

- This is 100% legal — your device, your app, your network
- Works best on a dedicated test device that stays on your local network
- The $99/year account still gives the cleanest experience but this works
