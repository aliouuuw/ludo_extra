# PWA Icons

This directory contains the PWA app icons for Ludo Extra.

## Required Icons

The following icon sizes are required for full PWA support:

### Standard Icons (purpose: any)
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

### Maskable Icons (purpose: maskable)
- icon-maskable-192x192.png
- icon-maskable-512x512.png

## Generating Icons

Icons should be generated from a source SVG or high-resolution PNG using a tool like:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

## Design Guidelines

- Use the Ludo Extra brand colors (neutral base with player color accents)
- Ensure maskable icons have safe zone padding (20% minimum)
- Test icons on both light and dark backgrounds
- Icons should be recognizable at small sizes (72x72)

## Temporary Note

Placeholder icons need to be generated before production deployment. The PWA will function without them in development, but Lighthouse will flag missing icons.
