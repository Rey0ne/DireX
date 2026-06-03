import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	plugins: [react()],
	define: {
		// Only set build time in production to enable demo expiry
		__BUILD_TIME__: mode === 'production' ? JSON.stringify(Date.now()) : '0',
		__API_URL__: JSON.stringify(process.env.VITE_API_URL || ''),
	},
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
			'/ue5-ws': {
				target: 'ws://localhost:3001',
				changeOrigin: true,
				ws: true,
			},
		},
	},
}))
