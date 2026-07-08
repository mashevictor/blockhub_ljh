import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', padding: 24, background: '#1a1612', color: '#f5f0e8' }}>
          <h1 style={{ color: '#f0d78c' }}>{this.props.fallbackTitle ?? '页面加载出错'}</h1>
          <p style={{ color: '#a89f8f' }}>{this.state.error.message}</p>
          <p style={{ marginTop: 16 }}>
            <a href="/" style={{ color: '#d4af37' }}>← 返回首页</a>
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
