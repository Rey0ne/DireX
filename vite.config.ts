import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	plugins: [react()],
	// GitHub Pages base path: set to '/repo-name/' for default URL,
	// or '/' if using a custom domain (e.g. direx.tapnow.com).
	// Build with: VITE_API_URL=https://api.yourdomain.com npm run build
	base: process.env.VITE_BASE || '/',
	define: {
		// Only set build time in production to enable demo expiry
		__BUILD_TIME__: mode === 'production' ? JSON.stringify(Date.now()) : '0',
		__API_URL__: JSON.stringify(process.env.VITE_API_URL || ''),
	},
	server: {
		allowedHosts: true,
		hmr: {
			protocol: 'ws',
			timeout: 120000,
			heartbeat: 15_000, // 2min heartbeat — prevents idle disconnect
		},
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
				timeout: 600000,
				proxyTimeout: 600000,
			},
			'/ue5-ws': {
				target: 'ws://localhost:3001',
				changeOrigin: true,
				ws: true,
			},
		},
	},
}))
