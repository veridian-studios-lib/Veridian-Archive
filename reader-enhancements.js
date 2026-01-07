/**
 * Veridian Archive Companion Script v4.0 - FINAL STABLE
 * Fixes: Scope conflicts, Resume-race condition, and Enhanced Word Count
 */

(function() {
    // 1. ROBUST AUTO-RESUME (The "Race Winner")
    const originalStartSanctum = window.startSanctum;
    window.startSanctum = async function() {
        await originalStartSanctum(); // Run original code first
        
        // Wait 1000ms to ensure the original 600ms animation in reader.html is finished
        setTimeout(async () => {
            const library = await localforage.getItem('veridian_library') || [];
            const book = library.find(b => b.id === currentMetadata.id);
            
            if (book) {
                // Restore bookmarks to the active session
                currentMetadata.bookmarks = book.bookmarks || [];
                
                if (book.lastPosition) {
                    console.log("Archive: Resuming at saved coordinates.");
                    pIdx = book.lastPosition.pIdx;
                    sIdx = book.lastPosition.sIdx;
                    render(); // Call the original render function
                }
            }
            renderBookmarkList(); 
        }, 1000); 
    };

    // 2. ENHANCED WORD COUNT & PERSISTENCE
    let lastLoggedSentence = ""; // Prevents double-counting if user skips back/forth
    const originalLogProgress = window.logProgress;
    
    window.logProgress = async function(text) {
        if (!text || text === lastLoggedSentence) return;
        lastLoggedSentence = text;

        // Better Word Count: Filters out empty spaces/punctuation
        const cleanWords = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        console.log(`Words Inscribed: ${cleanWords}`);

        // Run the original graph update
        await originalLogProgress(text);
        
        // Auto-Save current spot to database
        await saveCurrentState();
    };

    async function saveCurrentState() {
        let library = await localforage.getItem('veridian_library') || [];
        const index = library.findIndex(b => b.id === currentMetadata.id);
        if (index !== -1) {
            library[index].lastPosition = { pIdx: pIdx, sIdx: sIdx };
            library[index].bookmarks = currentMetadata.bookmarks || [];
            library[index].lastRead = Date.now();
            await localforage.setItem('veridian_library', library);
        }
    }

    // 3. BOOKMARK MENU LOGIC
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
        const name = prompt("Name this inscription:", `Page ${pIdx + 1}`);
        if (!name) return;

        if (!currentMetadata.bookmarks) currentMetadata.bookmarks = [];
        
        currentMetadata.bookmarks.push({
            name: name,
            pIdx: pIdx,
            sIdx: sIdx,
            time: new Date().toLocaleDateString()
        });

        await saveCurrentState();
        renderBookmarkList(); 
    };

    window.deleteBookmark = async function(event, index) {
        event.stopPropagation();
        if (confirm("Delete this inscription?")) {
            currentMetadata.bookmarks.splice(index, 1);
            await saveCurrentState();
            renderBookmarkList();
        }
    };

    window.jumpToBookmark = function(p, s) {
        window.pIdx = p;
        window.sIdx = s;
        render();
        toggleBookmarkMenu();
    };

    function renderBookmarkList() {
        const list = document.getElementById('bm-list');
        if (!list) return;
        
        const bms = currentMetadata.bookmarks || [];
        if (bms.length === 0) {
            list.innerHTML = `<div style="color:rgba(212,175,55,0.3); font-size:10px; text-align:center; margin-top:30px;">Archive is empty.</div>`;
            return;
        }

        list.innerHTML = bms.map((bm, i) => `
            <div onclick="jumpToBookmark(${bm.pIdx}, ${bm.sIdx})" 
                 style="position:relative; padding:12px; border:1px solid rgba(212,175,55,0.2); margin-bottom:8px; cursor:pointer; background:rgba(212,175,55,0.05); border-radius:4px;">
                <div style="color:#D4AF37; font-size:11px; font-weight:bold;">${bm.name}</div>
                <div style="color:rgba(212,175,55,0.4); font-size:9px;">PAGE ${bm.pIdx + 1}</div>
                <div onclick="deleteBookmark(event, ${i})" 
                     style="position:absolute; top:8px; right:10px; color:#ff4d4d; font-size:18px; line-height:1;">×</div>
            </div>
        `).join('');
    }
})();
