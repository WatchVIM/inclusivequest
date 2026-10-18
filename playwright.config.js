import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] } : undefined
  },
  projects: [{ name:'desktop', use:{ ...devices['Desktop Chrome'] } }, { name:'mobile', use:{ ...devices['Pixel 7'] } }],
  webServer: [
    { command:'VITE_CMS_ENABLED=true npm run dev -- --host 127.0.0.1', url:'http://127.0.0.1:5173', reuseExistingServer:!process.env.CI },
    { command:'npm run preview -- --host 127.0.0.1 --port 4173', url:'http://127.0.0.1:4173', reuseExistingServer:!process.env.CI }
  ]
});
