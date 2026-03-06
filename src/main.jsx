import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AuthProvider>
            <App />
        </AuthProvider>
    </React.StrictMode>,
)

// Fade out and remove the splash screen after React has painted
requestAnimationFrame(() => {
    setTimeout(() => {
        const splash = document.getElementById('sp-splash')
        if (splash) {
            splash.classList.add('fade-out')
            setTimeout(() => splash.remove(), 460)
        }
    }, 350)
})
