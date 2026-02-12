import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // React.StrictMode disabled to prevent double initialization issues with ThatOpen
  <App />
)
