import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, CheckCircle2, AlertCircle, FileText, Loader2, RefreshCw, ChevronDown } from 'lucide-react'
import { uploadStatement, getStatements, getCards } from '../utils/api'
import { useToast } from '../components/Toast'
import clsx from 'clsx'

export default function UploadPage() {
  const toast = useToast()
  const [cards, setCards] = useState([])
  const [selectedCard, setSelectedCard] = useState('')
  const [cardsLoading, setCardsLoading] = useState(true)
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const pollingRef = useRef({})

  // Load user's cards dynamically
  useEffect(() => {
    getCards().then(c => {
      setCards(c)
      if (c.length > 0) setSelectedCard(c[0].id)
      setCardsLoading(false)
    })
  }, [])

  useEffect(() => {
    return () => Object.values(pollingRef.current).forEach(clearInterval)
  }, [])

  const onDrop = useCallback(accepted => {
    setFiles(prev => [...prev, ...accepted.map(f => ({
      file: f, status: 'pending', progress: 0, result: null, error: null
    }))])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true
  })

  const pollForStatement = (filename, cardId, toastId) => {
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const statements = await getStatements()
        const found = statements.find(s => s.card_id === cardId && s.filename === filename)
        if (found) {
          clearInterval(interval)
          toast.remove(toastId)
          toast.success(`✓ ${filename} — ${found.transaction_count || 0} transactions, ${found.total_spend ? '$' + found.total_spend.toFixed(2) : ''}`)
          setFiles(prev => prev.map(f =>
            f.file.name === filename ? { ...f, status: 'done', result: found } : f
          ))
        } else if (attempts >= 20) {
          clearInterval(interval)
          toast.remove(toastId)
          toast.error(`Processing timed out for ${filename}`)
          setFiles(prev => prev.map(f =>
            f.file.name === filename ? { ...f, status: 'timeout' } : f
          ))
        }
      } catch { clearInterval(interval) }
    }, 3000)
    pollingRef.current[filename] = interval
  }

  const handleUpload = async () => {
    if (!selectedCard) { toast.error('Please select a card first'); return }
    setUploading(true)
    for (const item of files.filter(f => f.status === 'pending')) {
      setFiles(prev => prev.map(f => f.file.name === item.file.name ? { ...f, status: 'uploading' } : f))
      try {
        await uploadStatement(item.file, selectedCard, pct =>
          setFiles(prev => prev.map(f => f.file.name === item.file.name ? { ...f, progress: pct } : f))
        )
        setFiles(prev => prev.map(f => f.file.name === item.file.name ? { ...f, status: 'processing' } : f))
        const toastId = toast.info(`Processing ${item.file.name}…`, -1)
        pollForStatement(item.file.name, selectedCard, toastId)
      } catch (err) {
        const msg = err.response?.data?.detail || err.message
        setFiles(prev => prev.map(f => f.file.name === item.file.name ? { ...f, status: 'error', error: msg } : f))
        toast.error(`Failed: ${msg}`)
      }
    }
    setUploading(false)
  }

  const removeFile = (name) => {
    setFiles(prev => prev.filter(f => f.file.name !== name))
    if (pollingRef.current[name]) { clearInterval(pollingRef.current[name]); delete pollingRef.current[name] }
  }

  const selectedCardObj = cards.find(c => c.id === selectedCard)
  const pendingCount = files.filter(f => f.status === 'pending').length

  const statusIcon = (item) => {
    if (item.status === 'uploading')  return <Loader2 size={14} className="text-violet-400 animate-spin" />
    if (item.status === 'processing') return <RefreshCw size={14} className="text-amber-400 animate-spin" />
    if (item.status === 'done')       return <CheckCircle2 size={14} className="text-emerald" />
    if (item.status === 'error' || item.status === 'timeout') return <AlertCircle size={14} className="text-red-400" />
    return null
  }

  const statusText = (item) => {
    if (item.status === 'uploading') return (
      <div className="mt-1.5 h-1 bg-surface rounded-full overflow-hidden w-full">
        <div className="h-full bg-violet-500 transition-all" style={{ width: `${item.progress}%` }} />
      </div>
    )
    if (item.status === 'processing') return <p className="text-amber-400 text-xs mt-0.5">AI categorizing transactions…</p>
    if (item.status === 'done' && item.result) return <p className="text-emerald text-xs mt-0.5">✓ {item.result.transaction_count || 0} transactions · ${item.result.total_spend?.toFixed(2)}</p>
    if (item.status === 'error') return <p className="text-red-400 text-xs mt-0.5">{item.error}</p>
    if (item.status === 'timeout') return <p className="text-amber-400 text-xs mt-0.5">Check Statements page</p>
    return null
  }

  return (
    <div className="max-w-2xl mx-auto animate-fadeUp">
      <h1 className="font-display font-bold text-2xl text-text mb-1">Upload Statements</h1>
      <p className="text-dim text-sm mb-8">Drop PDF bank statements to parse, categorize, and analyze.</p>

      {/* Card selector — dynamic dropdown */}
      <div className="mb-6">
        <label className="block text-xs font-mono text-dim uppercase tracking-widest mb-2">Select Card</label>
        {cardsLoading ? (
          <div className="skeleton h-12 rounded-xl" />
        ) : cards.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-4 text-center">
            <p className="text-dim text-sm">No cards in your wallet.</p>
            <a href="/cards" className="text-violet-400 text-xs hover:underline mt-1 block">Add a card first →</a>
          </div>
        ) : (
          <div className="relative">
            <select
              value={selectedCard}
              onChange={e => setSelectedCard(e.target.value)}
              className="w-full appearance-none px-4 py-3 rounded-xl border border-border bg-panel text-text text-sm focus:outline-none focus:border-violet-500 transition-colors cursor-pointer pr-10"
            >
              {cards.map(card => (
                <option key={card.id} value={card.id}>
                  {card.name} — {card.bank}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
          </div>
        )}

        {/* Selected card pill */}
        {selectedCardObj && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <span className="text-xs font-mono text-dim">
              {selectedCardObj.reward_type === 'points' ? '🏆 Points card' :
               selectedCardObj.reward_type === 'miles'  ? '✈️ Miles card'  : '💵 Cash back card'}
            </span>
          </div>
        )}
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all mb-6',
          isDragActive ? 'border-violet-500 bg-violet-500/5' : 'border-border hover:border-muted bg-panel'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-4 text-muted" size={32} strokeWidth={1.5} />
        <p className="text-text font-display font-semibold mb-1">
          {isDragActive ? 'Drop your PDFs here' : 'Drag & drop PDF statements'}
        </p>
        <p className="text-dim text-sm">or click to browse · PDF only</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mb-6 space-y-2">
          {files.map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-panel border border-border rounded-xl px-4 py-3 group">
              <FileText size={16} className="text-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-text text-sm truncate">{item.file.name}</p>
                {statusText(item)}
              </div>
              {statusIcon(item)}
              {['pending','done','error','timeout'].includes(item.status) && (
                <button onClick={() => removeFile(item.file.name)}
                  className="opacity-0 group-hover:opacity-100 text-dim hover:text-red-400 transition-all text-xs ml-1">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {pendingCount > 0 && (
        <button onClick={handleUpload} disabled={uploading || !selectedCard}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-display font-semibold text-sm transition-all flex items-center justify-center gap-2">
          {uploading
            ? <><Loader2 size={16} className="animate-spin" /> Uploading…</>
            : `Upload ${pendingCount} file${pendingCount > 1 ? 's' : ''} to ${selectedCardObj?.name || ''}`
          }
        </button>
      )}
    </div>
  )
}
