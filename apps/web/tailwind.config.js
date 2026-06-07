/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: {
    preflight: false, // 避免与 antd 基础样式冲突
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
