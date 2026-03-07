import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, CheckCircle2, AlertCircle, FileText, Loader2, RefreshCw } from 'lucide-react'
import { uploadStatement, getStatements } from '../utils/api'
import { useToast } from '../components/Toast'
import clsx from 'clsx'

const CARDS = [
  { id: 'amex_bce',  name: 'Amex Blue Cash Everyday',      color: '#2E77D0', bank: 'American Express' },
  { id: 'bofa_ccr',  name: 'BofA Customized Cash Rewards', color: '#E31837', bank: 'Bank of America' },
]

export default function UploadPage() {
  const toast = useToast()
  const [selectedCard, setSelectedCard] = useState('amex_bce')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const pollingRef = useRef({})

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

  // Poll statements until the new one appears
  const pollForStatement = (filename, cardId, toastId) => {
    let attempts = 0
    const maxAttempts = 20 // 60 seconds

    const interval = setInterval(async () => {
      attempts++
      try {
        const statements = await getStatements()
        const found = statements.find(s =>
          s.card_id === cardId &&
          s.filename === filename
        )
        if (found) {
          clearInterval(interval)
          toast.remove(toastId)
          toast.success(`✓ ${filename} processed — ${found.transaction_count || 0} transactions, $${found.total_spend?.toFixed(2)} spend`)
          setFiles(prev => prev.map(f =>
            f.file.name === filename
              ? { ...f, status: 'done', result: found }
              : f
          ))
        } else if (attempts >= maxAttempts) {
          clearInterval(interval)
          toast.remove(toastId)
          toast.error(`Processing timed out for ${filename} — check Statements page`)
          setFiles(prev => prev.map(f =>
            f.file.name === filename ? { ...f, status: 'timeout' } : f
          ))
        }
      } catch (e) {
        clearInterval(interval)
      }
    }, 3000)

    pollingRef.current[filename] = interval
  }

  useEffect(() => {
    return () => {
      Object.values(pollingRef.current).forEach(clearInterval)
    }
  }, [])

  const handleUpload = async () => {
    setUploading(true)
    const pending = files.filter(f => f.status === 'pending')

    for (const item of pending) {
      setFiles(prev => prev.map(f =>
        f.file.name === item.file.name ? { ...f, status: 'uploading' } : f
      ))
      try {
        await uploadStatement(
          item.file,
          selectedCard,
          pct => setFiles(prev => prev.map(f =>
            f.file.name === item.file.name ? { ...f, progress: pct } : f
          ))
        )
        setFiles(prev => prev.map(f =>
          f.file.name === item.file.name ? { ...f, status: 'processing' } : f
        ))

        // Show persistent processing toast
        const toastId = toast.info(`Processing ${item.file.name}…`, -1)

        // Start polling
        pollForStatement(item.file.name, selectedCard, toastId)

      } catch (err) {
        const msg = err.response?.data?.detail || err.message
        setFiles(prev => prev.map(f =>
          f.file.name === item.file.name ? { ...f, status: 'error', error: msg } : f
        ))
        toast.error(`Failed to upload ${item.file.name}: ${msg}`)
      }
    }
    setUploading(false)
  }

  const removeFile = (name) => {
    setFiles(prev => prev.filter(f => f.file.name !== name))
    if (pollingRef.current[name]) {
      clearInterval(pollingRef.current[name])
      delete pollingRef.current[name]
    }
  }

  const pendingCount = files.filter(f => f.status === 'pending').length

  const statusIcon = (item) => {
    if (item.status === 'uploading') return <Loader2 size={14} className="text-violet-400 animate-spin" />
    if (item.status === 'processing') return <RefreshCw size={14} className="text-amber-400 animate-spin" />
    if (item.status === 'done') return <CheckCircle2 size={14} className="text-emerald" />
    if (item.status === 'error') return <AlertCircle size={14} className="text-red-400" />
    if (item.status === 'timeout') return <AlertCircle size={14} className="text-amber-400" />
    return <span className="text-xs text-dim font-mono">pending</span>
  }

  const statusText = (item) => {
    if (item.status === 'uploading') return <div className="mt-1.5 h-1 bg-surface rounded-full overflow-hidden"><div className="h-full bg-violet-500 transition-all" style={{ width: `${item.progress}%` }} /></div>
    if (item.status === 'processing') return <p className="text-amber-400 text-xs mt-0.5">Processing transactions…</p>
    if (item.status === 'done' && item.result) return <p className="text-emerald text-xs mt-0.5">✓ {item.result.transaction_count || 0} transactions · ${item.result.total_spend?.toFixed(2)}</p>
    if (item.status === 'error') return <p className="text-red-400 text-xs mt-0.5">{item.error}</p>
    if (item.status === 'timeout') return <p className="text-amber-400 text-xs mt-0.5">Check Statements page</p>
    return null
  }

  return (
    <div className="max-w-2xl mx-auto animate-fadeUp">
      <h1 className="font-display font-bold text-2xl text-text mb-1">Upload Statements</h1>
      <p className="text-dim text-sm mb-8">Drop PDF bank statements to parse, categorize, and analyze.</p>

      {/* Card selector */}
      <div className="mb-6">
        <label className="block text-xs font-mono text-dim uppercase tracking-widest mb-3">Select Card</label>
        <div className="grid grid-cols-2 gap-3">
          {CARDS.map(card => (
            <button
              key={card.id}
              onClick={() => setSelectedCard(card.id)}
              className={clsx(
                'text-left p-4 rounded-xl border transition-all',
                selectedCard === card.id
                  ? 'border-violet-500/50 bg-violet-500/10'
                  : 'border-border bg-panel hover:border-muted'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: card.color }} />
                <span className="text-xs font-mono text-dim">{card.bank}</span>
              </div>
              <p className="text-text text-sm font-display font-semibold">{card.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all mb-6',
          isDragActive
            ? 'border-violet-500 bg-violet-500/5'
            : 'border-border hover:border-muted bg-panel'
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
                <p className="text-text text-sm font-body truncate">{item.file.name}</p>
                {statusText(item)}
              </div>
              {statusIcon(item)}
              {(item.status === 'pending' || item.status === 'done' || item.status === 'error' || item.status === 'timeout') && (
                <button
                  onClick={() => removeFile(item.file.name)}
                  className="opacity-0 group-hover:opacity-100 text-dim hover:text-red-400 transition-all text-xs ml-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {pendingCount > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-display font-semibold text-sm transition-all flex items-center justify-center gap-2"
        >
          {uploading
            ? <><Loader2 size={16} className="animate-spin" />Uploading…</>
            : `Upload ${pendingCount} file${pendingCount > 1 ? 's' : ''}`
          }
        </button>
      )}
    </div>
  )
}
