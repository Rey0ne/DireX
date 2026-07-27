import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '')
	return {
		plugins: [react()],
		// GitHub Pages base path: set VITE_BASE in .env.production
		base: env.VITE_BASE || '/',
		define: {
			// Only set build time in production to enable demo expiry
			__BUILD_TIME__: mode === 'production' ? JSON.stringify(Date.now()) : '0',
			__API_URL__: JSON.stringify(env.VITE_API_URL || ''),
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
	}
})
