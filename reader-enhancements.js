/**
 * Veridian Archive Companion Script v3.0 - STABLE
 * Features: Deep-Sync Auto-Resume, Instant Bookmark Refresh, Robust Word Count
 */

(function() {
    // Helper to get the current book ID safely
    const getBookId = () => window.currentMetadata ? window.currentMetadata.id : null;

    // --- 1. ROBUST AUTO-RESUME ---
    const originalStartSanctum = window.startSanctum;
    window.startSanctum = async function() {
        // Run original logic (loads data into currentMetadata)
        await originalStartSanctum();
        
        const bookId = getBookId();
        if (!bookId) return;

        // Fetch the most recent data from localforage
        const library = await localforage.getItem('veridian_library') || [];
        const book = library.find(b => b.id === bookId);
        
        if (book) {
            // Force-sync bookmarks into the session
            window.currentMetadata.bookmarks = book.bookmarks || [];
            
            // DELAYED RESUME: Wait for the "Unlock" animation to finish (800ms)
            // This prevents the "blank page" bug where it jumps before the book exists
            setTimeout(() => {
                if (book.lastPosition) {
                    console.log("Veridian: Resuming Archive at Page " + (book.lastPosition.pIdx + 1));
                    window.pIdx = book.lastPosition.pIdx;
                    window.sIdx = book.lastPosition.sIdx;
                    window.render(); // Redraw the UI at the saved spot
                }
                renderBookmarkList(); 
            }, 850);
        }
    };

    // --- 2. ENHANCED WORD COUNT & COORDINATE SAVING ---
    const originalLogProgress = window.logProgress;
    window.logProgress = async function(text) {
        if (!text) return;

        // 1. Run original word count logic for the graph
        await originalLogProgress(text);
        
        // 2. Enhanced Logic: Save the EXACT location every time a sentence is logged
        await saveState();
    };

    async function saveState() {
        const bookId = getBookId();
        if (!bookId) return;

        let library = await localforage.getItem('veridian_library') || [];
        const index = library.findIndex(b => b.id === bookId);
        
        if (index !== -1) {
            // Anchor the current position
            library[index].lastPosition = { pIdx: window.pIdx, sIdx: window.sIdx };
            library[index].bookmarks = window.currentMetadata.bookmarks || [];
            library[index].lastRead = Date.now();
            
            await localforage.setItem('veridian_library', library);
        }
    }

    // --- 3. BOOKMARK MENU (Right-Side Summon) ---
    window.toggleBookmarkMenu = function() {
        const menu = document.getElementById('bm-menu');
        if (!menu) return;
        
        const isClosed = menu.style.right === '-300px' || menu.style.right === '';
        
        if (isClosed) {
            renderBookmarkList(); // Refresh list before opening
            menu.style.right = '0px';
        } else {
            menu.style.right = '-300px';
        }
    };

    window.addQuickBookmark = async function() {
        const name = prompt("Name this inscription:", `Page ${window.pIdx + 1}, Line ${window.sIdx + 1}`);
        if (name === null) return; 

        if (!window.currentMetadata.bookmarks) window.currentMetadata.bookmarks = [];
        
        window.currentMetadata.bookmarks.push({
            name: name || "Untitled Inscription",
            pIdx: window.pIdx,
            sIdx: window.sIdx,
            time: new Date().toLocaleDateString()
        });

        await saveState();
        renderBookmarkList(); // Instant UI update
    };

    window.deleteBookmark = async function(event, index) {
        event.stopPropagation(); // Stop the click from triggering a jump
        if (confirm("Erase this inscription?")) {
            window.currentMetadata.bookmarks.splice(index, 1);
            await saveState();
            renderBookmarkList();
        }
    };

    window.jumpToBookmark = function(p, s) {
        window.pIdx = p;
        window.sIdx = s;
        window.render();
        window.toggleBookmarkMenu(); // Auto-close menu
    };

    function renderBookmarkList() {
        const listContainer = document.getElementById('bm-list');
        if (!listContainer) return;
        
        const bms = window.currentMetadata && window.currentMetadata.bookmarks ? window.currentMetadata.bookmarks : [];
        
        if (bms.length === 0) {
            listContainer.innerHTML = `<p style="color: rgba(212,175,55,0.3); font-size: 10px; text-align: center; margin-top: 40px; font-style: italic;">The Archive is empty...</p>`;
            return;
        }

        listContainer.innerHTML = bms.map((bm, i) => `
            <div onclick="jumpToBookmark(${bm.pIdx}, ${bm.sIdx})" 
                 style="position: relative; padding: 15px; border: 1px solid rgba(212,175,55,0.1); margin-bottom: 12px; cursor: pointer; background: rgba(212,175,55,0.03); border-radius: 4px;">
                <div style="color: #D4AF37; font-size: 11px; font-weight: bold; margin-bottom: 4px;">${bm.name}</div>
                <div style="color: rgba(212,175,55,0.4); font-size: 9px; letter-spacing: 1px;">PAGE ${bm.pIdx + 1} • ${bm.time}</div>
                
                <div onclick="deleteBookmark(event, ${i})" 
                     style="position: absolute; top: 50%; right: 15px; transform: translateY(-50%); color: #ff4d4d; font-size: 18px; opacity: 0.6; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                     ×
                </div>
            </div>
        `).join('');
    }
})();
