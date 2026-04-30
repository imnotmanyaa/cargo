import React from 'react'
import 'whatwg-fetch'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Force unregister all service workers to clear any sticky cache issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
