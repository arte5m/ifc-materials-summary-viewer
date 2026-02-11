import ReactDOM from 'react-dom/client'
import App from './App'
import * as BUI from '@thatopen/ui'

BUI.Manager.init()

ReactDOM.createRoot(document.getElementById('root')!).render(
  // React.StrictMode disabled to prevent double initialization issues with ThatOpen
  <App />
)
