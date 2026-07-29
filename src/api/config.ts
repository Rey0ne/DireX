/* === Shared API configuration === */
/* Central BACKEND_URL — use this everywhere instead of bare /api/ paths */
/* In dev: empty string → relative /api/... hits Vite proxy → localhost:3001 */
/* In production: set via VITE_API_URL in .env.production → full tunnel/origin URL */

export const BACKEND_URL: string = import.meta.env.VITE_API_URL || '';
