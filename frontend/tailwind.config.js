export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { display: ['Syne','sans-serif'], body: ['DM Sans','sans-serif'], mono: ['JetBrains Mono','monospace'] },
      colors: { ink: '#0A0A0F', surface: '#13131A', panel: '#1C1C27', border: '#2A2A3A', muted: '#4A4A6A', text: '#E8E8F0', dim: '#8888AA', amex: '#2E77D0', bofa: '#E31837', gold: '#F5C842', emerald: '#2DD4A0', violet: '#8B5CF6' }
    }
  },
  plugins: []
}
