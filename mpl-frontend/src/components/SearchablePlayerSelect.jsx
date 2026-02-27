// Searchable player dropdown: filter by typing, optional filter by player IDs (e.g. match teams)
import React, { useState, useMemo, useRef, useEffect } from 'react';
import './SearchablePlayerSelect.css';

const listboxIdBase = 'searchable-player-listbox';

const SearchablePlayerSelect = ({ players = [], value, onChange, placeholder = 'Search player...', filterPlayerIds = null, disabled, id, label }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef(null);
    const listboxRef = useRef(null);
    const listId = `${listboxIdBase}-${id || 'default'}`;

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

    // Options: [Clear, ...filtered]. Index 0 = Clear, 1+ = filtered players
    const optionCount = 1 + filtered.length;
    const selectByIndex = (idx) => {
        if (idx <= 0) {
            onChange('');
            setOpen(false);
            setSearch('');
        } else {
            const p = filtered[idx - 1];
            if (p) {
                onChange(String(p.player_id));
                setOpen(false);
                setSearch('');
            }
        }
        setHighlightedIndex(-1);
    };

    useEffect(() => {
        if (!open) setHighlightedIndex(-1);
    }, [open]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const onTriggerKeyDown = (e) => {
        if (disabled) return;
        if (e.key === 'Escape') {
            setOpen(false);
            return;
        }
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            if (!open) setOpen(true);
            else if (e.key !== ' ') setHighlightedIndex(prev => (prev < 0 ? 0 : Math.min(prev + 1, optionCount - 1)));
        }
        if (e.key === 'ArrowUp' && open) {
            e.preventDefault();
            setHighlightedIndex(prev => (prev <= 0 ? optionCount - 1 : prev - 1));
        }
    };

    const onListKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            containerRef.current?.querySelector('.searchable-player-select-trigger')?.focus();
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev < optionCount - 1 ? prev + 1 : 0));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev <= 0 ? optionCount - 1 : prev - 1));
            return;
        }
        if (e.key === 'Enter' && highlightedIndex >= 0) {
            e.preventDefault();
            selectByIndex(highlightedIndex);
        }
    };

    return (
        <div className="searchable-player-select" ref={containerRef}>
            {label && <label htmlFor={id}>{label}</label>}
            <div
                className="searchable-player-select-trigger"
                onClick={() => !disabled && setOpen(!open)}
                onKeyDown={onTriggerKeyDown}
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-controls={listId}
                id={id}
                tabIndex={disabled ? -1 : 0}
            >
                <span className="searchable-player-select-value">
                    {selectedPlayer ? selectedPlayer.name : placeholder}
                </span>
                <span className="searchable-player-select-arrow">{open ? '▲' : '▼'}</span>
            </div>
            {open && (
                <div
                    ref={listboxRef}
                    id={listId}
                    className="searchable-player-select-dropdown"
                    role="listbox"
                    tabIndex={-1}
                    onKeyDown={onListKeyDown}
                >
                    <input
                        type="text"
                        className="searchable-player-select-search"
                        placeholder="Type to filter..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setOpen(false); } }}
                        autoFocus
                        aria-label="Filter players"
                    />
                    <ul className="searchable-player-select-list">
                        <li
                            role="option"
                            aria-selected={highlightedIndex === 0}
                            className={`searchable-player-select-option ${highlightedIndex === 0 ? 'highlighted' : ''} ${!value ? 'selected' : ''}`}
                            onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
                        >
                            — Clear —
                        </li>
                        {filtered.map((p, i) => (
                            <li
                                key={p.player_id}
                                role="option"
                                aria-selected={highlightedIndex === i + 1 || value === String(p.player_id)}
                                className={`searchable-player-select-option ${highlightedIndex === i + 1 ? 'highlighted' : ''} ${value === String(p.player_id) ? 'selected' : ''}`}
                                onClick={() => { onChange(String(p.player_id)); setOpen(false); setSearch(''); }}
                            >
                                {p.name} {p.role ? `(${p.role})` : ''}
                            </li>
                        ))}
                        {filtered.length === 0 && <li className="searchable-player-select-option muted" role="option">No players match</li>}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchablePlayerSelect;
