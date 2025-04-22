// mpl-project/mpl-frontend/src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom'; // Use NavLink for active styling

function Navbar() {
    const navigate = useNavigate();
    // State to track login status for immediate UI updates
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

    // Function to check login status from localStorage
    const checkLoginStatus = () => {
       let loggedIn = false;
       try {
           const adminInfoString = localStorage.getItem('adminInfo');
           if (adminInfoString) {
               const adminInfo = JSON.parse(adminInfoString);
               // Basic check: Does a token exist?
               // Optional: Add more robust check (e.g., decode token, check expiry)
               loggedIn = !!adminInfo?.token;
           }
       } catch (error) {
            console.error("Error reading admin login status:", error);
            // Ensure logged out state if storage is corrupted
            localStorage.removeItem('adminInfo');
       }
       setIsAdminLoggedIn(loggedIn);
    };


    // Check login status on initial component mount
    useEffect(() => {
       checkLoginStatus();

       // Optional: Listen for storage events to sync login status across tabs/windows
       // This helps if the user logs in/out in another tab.
       const handleStorageChange = (event) => {
            if (event.key === 'adminInfo') {
                console.log("Storage changed for adminInfo, re-checking login status.");
                checkLoginStatus();
           }
       };
       window.addEventListener('storage', handleStorageChange);

       // Cleanup listener on component unmount
       return () => {
           window.removeEventListener('storage', handleStorageChange);
       };
    }, []); // Empty dependency array ensures this runs only once on mount


    // Handler for the logout button
    const logoutHandler = () => {
        console.log("Admin logging out.");
        localStorage.removeItem('adminInfo'); // Clear authentication info
        setIsAdminLoggedIn(false); // Update UI state immediately
        navigate('/admin/login'); // Redirect to the login page
    };

    return (
        <nav>
           {/* Use NavLink for automatic 'active' class */}
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink>
            <NavLink to="/players" className={({ isActive }) => isActive ? 'active' : ''}>Players</NavLink>
            <NavLink to="/schedule" className={({ isActive }) => isActive ? 'active' : ''}>Schedule</NavLink>
            <NavLink to="/standings" className={({ isActive }) => isActive ? 'active' : ''}>Standings</NavLink> 
            <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'active' : ''}>Leaderboard</NavLink> 
            {/* Add other public navigation links here */}

            {/* Right-aligned section for admin links/button */}
            <div className="nav-right"> {/* Use CSS class for alignment */}
                {isAdminLoggedIn ? (
                    <>
                        <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>Admin</NavLink>
                        <button onClick={logoutHandler}>Logout</button>
                    </>
                ) : (
                    <NavLink to="/admin/login" className={({ isActive }) => isActive ? 'active' : ''}>Admin Login</NavLink>
                )}
            </div>
        </nav>
    );
}
export default Navbar;