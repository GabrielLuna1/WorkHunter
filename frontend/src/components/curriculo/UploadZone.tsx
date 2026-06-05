'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'

const API = '/api/v1/curriculo'

interface UploadZoneProps {
  onSuccess: (data: any) => void
}

type Step = 'idle' | 'uploading' | 'parsing' | 'structuring' | 'success' | 'error'

export function UploadZone({ onSuccess }: UploadZoneProps) {
  const [step, setStep] = useState<Step>('idle')
  const [fileName, setFileName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    setFileName(file.name)
    setStep('uploading')
    setErrorMsg('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      setStep('parsing')

      const res = await api.post(`${API}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      })

      setStep('structuring')

      if (res.data?.success) {
        setStep('success')
        setTimeout(() => onSuccess(res.data.data), 800)
      } else {
        throw new Error(res.data?.detail || 'Erro ao processar currículo')
      }
    } catch (err: any) {
      setStep('error')
      const msg = err?.response?.data?.detail || err.message || 'Erro desconhecido'
      setErrorMsg(msg)
    }
  }, [onSuccess])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  })

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div
        {...getRootProps()}
        className={`w-full max-w-lg p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-accent bg-accent/5'
            : step === 'error'
              ? 'border-danger/40 bg-danger/5 hover:border-danger/60'
              : 'border-hairline hover:border-hairline-strong bg-surface/50 hover:bg-surface'
        }`}
      >
        <input {...getInputProps()} />
        {step === 'uploading' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
            <p className="text-sm text-ink-muted">Enviando {fileName}...</p>
          </div>
        )}
        {step === 'parsing' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <p className="text-sm text-ink-muted">Importando currículo...</p>
            </div>
          </div>
        )}
        {step === 'structuring' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-accent/60 animate-pulse" style={{ animationDelay: '0.3s' }} />
              <p className="text-sm text-ink-muted">Estruturando documento...</p>
            </div>
          </div>
        )}
        {step === 'success' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="w-10 h-10 text-success" />
            <p className="text-sm font-medium text-success">Currículo processado com sucesso!</p>
            <p className="text-xs text-ink-tertiary">{fileName}</p>
            <p className="text-[10px] text-ink-tertiary animate-pulse">Redirecionando...</p>
          </div>
        )}
        {step === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="w-10 h-10 text-danger" />
            <p className="text-sm text-danger">{errorMsg}</p>
            <p className="text-xs text-ink-tertiary">Clique para tentar novamente</p>
          </div>
        )}
        {step === 'idle' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink-muted">
                {isDragActive ? 'Solte o arquivo aqui' : 'Arraste ou clique para enviar'}
              </p>
              <p className="text-xs text-ink-tertiary mt-1">Apenas PDF (máx. 10MB)</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-ink-tertiary mt-2">
              <FileText className="w-3 h-3" />
              Formatos aceitos: .pdf
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
