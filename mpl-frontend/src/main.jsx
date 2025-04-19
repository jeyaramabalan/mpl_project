// mpl-project/mpl-frontend/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // Your main App component
import { SocketProvider } from './context/SocketContext.jsx'; // Import the SocketProvider
import './index.css' // Import global styles

// Get the root element from index.html
const rootElement = document.getElementById('root');

// Create a React root
const root = ReactDOM.createRoot(rootElement);

// Render the application
root.render(
  <React.StrictMode> {/* Enables checks and warnings during development */}
    <SocketProvider> {/* Wrap the entire App with SocketProvider so context is available everywhere */}
      <App />
    </SocketProvider>
  </React.StrictMode>,
)