import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Mantém o plugin React para suportar JSX/TSX e Fast Refresh.
  plugins: [react()],
})
