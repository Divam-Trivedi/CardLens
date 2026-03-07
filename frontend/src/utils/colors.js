export const CATEGORY_COLORS = {
  'Supermarkets':'#2DD4A0','Wholesale Clubs':'#34D399','Dining':'#F59E0B','Fast Food':'#FBBF24',
  'Coffee':'#D97706','Gas Stations':'#EF4444','Online Shopping':'#8B5CF6','Travel':'#2E77D0',
  'Hotels':'#60A5FA','Airlines':'#3B82F6','Transportation':'#06B6D4','Streaming':'#EC4899',
  'Subscriptions':'#F472B6','Drug Stores':'#10B981','Home Improvement':'#F97316',
  'Electronics':'#A78BFA','Clothing':'#FB7185','Healthcare':'#4ADE80','Entertainment':'#FACC15',
  'Education':'#7DD3FC','Utilities':'#94A3B8','Insurance':'#CBD5E1','Other':'#4A4A6A','Uncategorized':'#3A3A5A'
}
export const CARD_COLORS = {
  amex_bce:  '#2E77D0',
  bofa_ccr:  '#E31837',
  chase_sapphire_preferred: '#1A1F71',
  amex_gold: '#C9A84C',
  default:   '#8888AA',
}
export const getCategoryColor = (category) => {
  const map = {
    'Dining':         '#FF6B6B',
    'Groceries':      '#4ECDC4',
    'Gas':            '#45B7D1',
    'Shopping':       '#96CEB4',
    'Travel':         '#FFEAA7',
    'Entertainment':  '#DDA0DD',
    'Healthcare':     '#98FB98',
    'Utilities':      '#F0E68C',
    'Online Shopping':'#87CEEB',
    'Supermarkets':   '#4ECDC4',
    'Other':          '#8888AA',
    'Uncategorized':  '#666688',
  }
  return map[category] || '#8888AA'
}
export const fmt$ = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n||0)
// export const getCategoryColor = (cat) => CATEGORY_COLORS[cat] || '#4A4A6A'
const PALETTE = Object.values(CATEGORY_COLORS)
export const getColor = (i) => PALETTE[i % PALETTE.length]
