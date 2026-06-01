import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	plugins: [react()],
	define: {
		__BUILD_TIME__: JSON.stringify(Date.now()),
		__API_URL__: JSON.stringify(process.env.VITE_API_URL || ''),
	},
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
		},
	},
}))

