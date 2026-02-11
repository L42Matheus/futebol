import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext' // Import AuthProvider
import { AccountTypeProvider } from './context/AccountTypeContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AccountTypeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AccountTypeProvider>
  </React.StrictMode>,
)
