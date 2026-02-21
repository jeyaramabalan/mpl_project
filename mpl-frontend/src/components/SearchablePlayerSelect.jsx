// Searchable player dropdown: filter by typing, optional filter by player IDs (e.g. match teams)
import React, { useState, useMemo, useRef, useEffect } from 'react';
import './SearchablePlayerSelect.css';

const SearchablePlayerSelect = ({ players = [], value, onChange, placeholder = 'Search player...', filterPlayerIds = null, disabled, id, label }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    const filtered = useMemo(() => {
        let list = players;
        if (filterPlayerIds && Array.isArray(filterPlayerIds)) {
            list = list.filter(p => filterPlayerIds.includes(p.player_id));
        }
        if (!search.trim()) return list;
        const q = search.trim().toLowerCase();
        return list.filter(p => (p.name || '').toLowerCase().includes(q));
    }, [players, filterPlayerIds, search]);

    const selectedPlayer = players.find(p => p.player_id === parseInt(value));

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="searchable-player-select" ref={containerRef}>
            {label && <label htmlFor={id}>{label}</label>}
            <div
                className="searchable-player-select-trigger"
                onClick={() => !disabled && setOpen(!open)}
                role="combobox"
                aria-expanded={open}
                aria-haspoplist="listbox"
                id={id}
            >
                <span className="searchable-player-select-value">
                    {selectedPlayer ? selectedPlayer.name : placeholder}
                </span>
                <span className="searchable-player-select-arrow">{open ? '▲' : '▼'}</span>
            </div>
            {open && (
                <div className="searchable-player-select-dropdown" role="listbox">
                    <input
                        type="text"
                        className="searchable-player-select-search"
                        placeholder="Type to filter..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                    <ul className="searchable-player-select-list">
                        <li
                            role="option"
                            className="searchable-player-select-option"
                            onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
                        >
                            — Clear —
                        </li>
                        {filtered.map(p => (
                            <li
                                key={p.player_id}
                                role="option"
                                className={`searchable-player-select-option ${value === String(p.player_id) ? 'selected' : ''}`}
                                onClick={() => { onChange(String(p.player_id)); setOpen(false); setSearch(''); }}
                            >
                                {p.name} {p.role ? `(${p.role})` : ''}
                            </li>
                        ))}
                        {filtered.length === 0 && <li className="searchable-player-select-option muted">No players match</li>}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchablePlayerSelect;
