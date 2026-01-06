/**
 * Veridian Archive Companion Script v2.0
 * Features: Auto-Resume, Named Bookmarks with Delete, and Sliding Menu
 */

(function() {
    // --- 1. INITIALIZATION & AUTO-RESUME ---
    const originalStartSanctum = window.startSanctum;
    window.startSanctum = async function() {
        // Run original loading logic first
        await originalStartSanctum();
        
        const library = await localforage.getItem('veridian_library') || [];
        const book = library.find(b => b.id === currentMetadata.id);
        
        if (book) {
            // Load saved bookmarks into the global metadata
            window.currentMetadata.bookmarks = book.bookmarks || [];
            
            // AUTO-RESUME: Check for last saved position
            if (book.lastPosition) {
                console.log("Veridian: Resuming from last inscription...");
                window.pIdx = book.lastPosition.pIdx;
                window.sIdx = book.lastPosition.sIdx;
                window.render(); // Instantly jump to the saved page
            }
        }
        renderBookmarkList(); 
    };

    // --- 2. IMPROVED WORD COUNT & AUTO-SAVE ---
    // Wraps original progress logger to save position every time you read a sentence
    const originalLogProgress = window.logProgress;
    window.logProgress = async function(text) {
        if (!text) return;
        
        // Let the original function handle the math/graph logic
        await originalLogProgress(text);
        
        // Immediately save the exact coordinate (Page and Sentence)
        saveState();
    };

    async function saveState() {
        let library = await localforage.getItem('veridian_library') || [];
        const index = library.findIndex(b => b.id === currentMetadata.id);
        if (index !== -1) {
            library[index].lastPosition = { pIdx: window.pIdx, sIdx: window.sIdx };
            library[index].bookmarks = window.currentMetadata.bookmarks || [];
            library[index].lastRead = Date.now();
            await localforage.setItem('veridian_library', library);
        }
    }

    // --- 3. BOOKMARK MENU LOGIC ---
    
    // Summons/Dismisses the menu from the right
    window.toggleBookmarkMenu = function() {
        const menu = document.getElementById('bm-menu');
        if (!menu) return;
        
        const isClosed = menu.style.right === '-300px' || menu.style.right === '';
        menu.style.right = isClosed ? '0px' : '-300px';
    };

    // Adds a bookmark and immediately prompts for a name
    window.addQuickBookmark = async function() {
        const name = prompt("Name this inscription:", `Page ${window.pIdx + 1}, Line ${window.sIdx + 1}`);
        if (name === null) return; // Cancelled

        if (!window.currentMetadata.bookmarks) window.currentMetadata.bookmarks = [];
        
        window.currentMetadata.bookmarks.push({
            name: name || "Untitled Inscription",
            pIdx: window.pIdx,
            sIdx: window.sIdx,
            time: new Date().toLocaleDateString()
        });

        await saveState();
        renderBookmarkList();
        alert("Position marked in the Archive.");
    };

    // Removes a bookmark using the 'X' button
    window.deleteBookmark = async function(event, index) {
        event.stopPropagation(); // Prevents jumping to the bookmark when deleting
        if (confirm("Erase this inscription forever?")) {
            window.currentMetadata.bookmarks.splice(index, 1);
            await saveState();
            renderBookmarkList();
        }
    };

    // Jumps to the coordinate
    window.jumpToBookmark = function(p, s) {
        window.pIdx = p;
        window.sIdx = s;
        window.render();
        window.toggleBookmarkMenu(); // Close menu after jumping
    };

    // Renders the list with Delete (X) buttons
    function renderBookmarkList() {
        const listContainer = document.getElementById('bm-list');
        if (!listContainer) return;
        
        const bms = window.currentMetadata.bookmarks || [];
        
        if (bms.length === 0) {
            listContainer.innerHTML = `<p style="color: rgba(212,175,55,0.3); font-size: 10px; text-align: center; margin-top: 20px;">No inscriptions found.</p>`;
            return;
        }

        listContainer.innerHTML = bms.map((bm, i) => `
            <div onclick="jumpToBookmark(${bm.pIdx}, ${bm.sIdx})" 
                 style="position: relative; padding: 15px; border: 1px solid rgba(212,175,55,0.1); margin-bottom: 10px; cursor: pointer; background: rgba(212,175,55,0.03); border-radius: 4px; transition: 0.3s;">
                <div style="color: #D4AF37; font-size: 11px; font-weight: bold; margin-bottom: 4px; padding-right: 20px;">${bm.name}</div>
                <div style="color: rgba(212,175,55,0.4); font-size: 9px; letter-spacing: 1px;">${bm.time} • PAGE ${bm.pIdx + 1}</div>
                
                <div onclick="deleteBookmark(event, ${i})" 
                     style="position: absolute; top: 10px; right: 10px; color: #ff4d4d; font-size: 14px; opacity: 0.5; padding: 5px;">
                     ×
                </div>
            </div>
        `).join('');
    }
})();
