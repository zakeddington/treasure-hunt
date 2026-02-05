# Client Scripts

## Structure

- **client.js** - Main client application entry point
- **server.js** - Server application (not bundled)

## Building

The client scripts are bundled using esbuild:

```bash
npm run build:js
```

This bundles `client.js` and its dependencies into a single IIFE file at `public/assets/scripts/client.js`.

## Development

When running `npm run dev`, changes to any file in `src/scripts` will trigger a rebuild of the bundled client.js.
