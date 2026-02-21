// mpl-project/mpl-frontend/src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';

// Determine the base URL for the Socket.IO server from environment variables or use a default
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://mpl.supersalessoft.com';
//const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5173';
console.log(`Socket Context configured for URL: ${SOCKET_URL}`);

// Create the React Context object
const SocketContext = createContext(null);

// Custom hook to easily consume the Socket context in components
export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        // Ensure the hook is used within a component wrapped by SocketProvider
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

// The Provider component that wraps parts of the application needing socket access
export const SocketProvider = ({ children }) => {
    // useMemo ensures the socket instance is created only once during the component's lifecycle.
    // This prevents creating new connections on every re-render.
    const socket = useMemo(() => io(SOCKET_URL, {
        autoConnect: false, // Prevents automatically connecting on initialization. We'll connect manually.
        reconnectionAttempts: 5, // Number of times to try reconnecting after a disconnect.
        reconnectionDelay: 3000, // Time (in ms) to wait before attempting reconnection.
        // Optional: Add authentication details if your socket server requires it on connection.
        // auth: (cb) => {
        //   // Example: Get token from local storage for authentication
        //   const token = localStorage.getItem('adminToken'); // Adjust storage key as needed
        //   cb({ token });
        // }
    }), []); // Empty dependency array means this runs only once on mount

    // State to track the connection status
    const [isConnected, setIsConnected] = useState(socket.connected);

    // Effect hook to manage socket event listeners and connection lifecycle
    useEffect(() => {
        // Define event handlers
        const onConnect = () => {
            console.log(`Socket connected: ${socket.id}`);
            setIsConnected(true);
        };
        const onDisconnect = (reason) => {
            console.log(`Socket disconnected: ${reason}`);
            setIsConnected(false);
            // Handle specific disconnect reasons if needed
            if (reason === 'io server disconnect') {
                // The server explicitly disconnected the socket (e.g., auth failure?)
                // You might want to prevent automatic reconnection attempts here if it's an auth issue.
                console.warn("Disconnected by server.");
            }
            // else: the socket will automatically try to reconnect based on settings
        };
        const onConnectError = (err) => {
            console.error(`Socket connection error: ${err.message}`);
            // Example: Handle authentication errors during connection
            // if (err.message === 'Authentication error') { ... redirect to login ... }
        };

        // Register event listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        // Attempt to connect the socket when the provider mounts
        // If connection depends on user login, you might call connectSocket() after successful login instead.
        console.log("SocketProvider Mounted: Attempting to connect socket...");
        socket.connect();

        // Cleanup function: Runs when the component unmounts
        return () => {
            console.log("SocketProvider Unmounting: Cleaning up socket listeners and disconnecting.");
            // Remove event listeners to prevent memory leaks
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            // Disconnect the socket when the provider is unmounted (e.g., user logs out or app closes)
             if (socket.connected) {
                 socket.disconnect();
             }
        };
    }, [socket]); // The effect depends only on the socket instance itself


    // --- Memoized Socket Action Functions ---
    // useCallback ensures these functions have stable identities across re-renders,
    // preventing unnecessary re-renders in consuming components if passed as props/context.

    const connectSocket = useCallback(() => {
        if (!socket.connected) {
             console.log("Manual socket connect initiated.");
            socket.connect();
        }
    }, [socket]);

    const disconnectSocket = useCallback(() => {
        if (socket.connected) {
             console.log("Manual socket disconnect initiated.");
            socket.disconnect();
        }
    }, [socket]);

    // Function to join a specific match room
    const joinMatchRoom = useCallback((matchId) => {
        if (socket?.connected && matchId) {
            console.log(`Socket emitting [joinMatchRoom] for match: ${matchId}`);
            socket.emit('joinMatchRoom', matchId);
        } else {
            console.warn(`Cannot join room ${matchId}: Socket not connected or matchId missing.`);
        }
    }, [socket]); // Depends on socket instance

    // Function to leave a specific match room
    const leaveMatchRoom = useCallback((matchId) => {
        if (socket?.connected && matchId) {
            console.log(`Socket emitting [leaveMatchRoom] for match: ${matchId}`);
            socket.emit('leaveMatchRoom', matchId);
        }
         // No warning if not connected, leaving is less critical
    }, [socket]);

    // Function for admin scorer to send ball-by-ball data
    const scoreBallAction = useCallback((scoreData) => {
        if (socket?.connected && scoreData) {
            console.log('Socket emitting [scoreBall]:', scoreData);
            socket.emit('scoreBall', scoreData);
        } else {
            console.warn('Cannot emit [scoreBall]: Socket not connected or scoreData missing.');
        }
    }, [socket]);

    // Function for admin scorer to signal the start of live scoring
    const startMatchScoringAction = useCallback((matchId, initialState) => {
        if (socket?.connected && matchId && initialState) {
            console.log(`Socket emitting [startMatchScoring] for match: ${matchId}`);
            socket.emit('startMatchScoring', matchId, initialState);
        } else {
             console.warn('Cannot emit [startMatchScoring]: Socket not connected or required data missing.');
        }
    }, [socket]);


    // --- Context Value ---
    // useMemo creates a stable context value object. Only updates if dependencies change.
    const contextValue = useMemo(() => ({
        socket, // The raw socket instance (use with care)
        isConnected, // Boolean connection status
        // Helper functions for common actions:
        connectSocket,
        disconnectSocket,
        joinMatchRoom,
        leaveMatchRoom,
        scoreBallAction,
        startMatchScoringAction
    }), [socket, isConnected, connectSocket, disconnectSocket, joinMatchRoom, leaveMatchRoom, scoreBallAction, startMatchScoringAction]); // Dependencies that trigger context update

    // Provide the context value to child components
    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
};