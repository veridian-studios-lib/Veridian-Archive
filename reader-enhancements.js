/**
 * Veridian Archive Companion Script v6.0 - ULTIMATE STABLE
 * Features: Screen Wake Lock (No Timeout), Deep-Sync Auto-Resume, 
 * Instant Bookmark Jump, Audio-Safe Transitions.
 */

(function() {
    let wakeLock = null;

    // Helper to ensure we are targeting global variables correctly
    const syncGlobals = () => {
        return {
            currentBookId: typeof currentMetadata !== 'undefined' ? currentMetadata.id : null,
        };
    };

    // --- 1. SCREEN WAKE LOCK (PREVENT TIMEOUT) ---
    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log("Veridian: Screen Wake Lock Active (Stay Awake)");
                
                // If the lock is released (e.g. by switching tabs), clear the variable
                wakeLock.addEventListener('release', () => {
                    console.log("Veridian: Wake Lock Released");
                    wakeLock = null;
                });
            } catch (err) {
                console.error(`Veridian: Wake Lock Error: ${err.name}, ${err.message}`);
            }
        }
    }

    // Re-request wake lock when the app becomes visible again
    document.addEventListener('visibilitychange', async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
            await requestWakeLock();
        }
    });

    // --- 2. ROBUST AUTO-RESUME ---
    const originalStartSanctum = window.startSanctum;
    window.startSanctum = async function() {
        await originalStartSanctum(); 
        
        // Activate Wake Lock as soon as reading begins
        requestWakeLock();
        
        const { currentBookId } = syncGlobals();
        if (!currentBookId) return;

        // Wait for the reader.html 600ms unlock animation to settle
        setTimeout(async () => {
            const library = await localforage.getItem('veridian_library') || [];
            const book = library.find(b => b.id === currentBookId);
            
            if (book) {
                if (typeof currentMetadata !== 'undefined') {
                    currentMetadata.bookmarks = book.bookmarks || [];
                }
                
                if (book.lastPosition) {
                    console.log("Archive: Resuming at saved coordinates.");
                    pIdx = book.lastPosition.pIdx;
                    sIdx = book.lastPosition.sIdx;
                    if (typeof render === 'function') render(); 
                }
            }
            renderBookmarkList(); 
        }, 800); 
    };

    // --- 3. ENHANCED WORD COUNT & PERSISTENCE ---
    const originalLogProgress = window.logProgress;
    window.logProgress = async function(text) {
        if (!text) return;
        if (typeof originalLogProgress === 'function') {
            await originalLogProgress(text);
        }
        await saveCurrentState();
    };

    async function saveCurrentState() {
        const { currentBookId } = syncGlobals();
        if (!currentBookId) return;

        let library = await localforage.getItem('veridian_library') || [];
        const index = library.findIndex(b => b.id === currentBookId);
        
        if (index !== -1) {
            library[index].lastPosition = { pIdx: pIdx, sIdx: sIdx };
            library[index].bookmarks = currentMetadata.bookmarks || [];
            library[index].lastRead = Date.now();
            await localforage.setItem('veridian_library', library);
        }
    }

    // --- 4. THE "INSTANT JUMP" & MENU LOGIC ---
    window.toggleBookmarkMenu = function() {
        const menu = document.getElementById('bm-menu');
        if (!menu) return;
        
        const isClosed = menu.style.right === '-300px' || menu.style.right === '';
        if (isClosed) {
            renderBookmarkList();
            menu.style.right = '0px';
        } else {
            menu.style.right = '-300px';
        }
    };

    window.jumpToBookmark = function(p, s) {
        console.log(`Archive: Jumping to Page ${p + 1}`);
        if (window.speechSynthesis) window.speechSynthesis.cancel();

        pIdx = p;
        sIdx = s;

        if (typeof render === 'function') render();
        window.toggleBookmarkMenu();
        saveCurrentState();
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
        if (confirm("Erase this inscription?")) {
            currentMetadata.bookmarks.splice(index, 1);
            await saveCurrentState();
            renderBookmarkList();
        }
    };

    function renderBookmarkList() {
        const list = document.getElementById('bm-list');
        if (!list) return;
        
        const bms = currentMetadata.bookmarks || [];
        if (bms.length === 0) {
            list.innerHTML = `<div style="color:rgba(212,175,55,0.3); font-size:10px; text-align:center; margin-top:30px; font-style:italic;">No inscriptions found.</div>`;
            return;
        }

        list.innerHTML = bms.map((bm, i) => `
            <div onclick="jumpToBookmark(${bm.pIdx}, ${bm.sIdx})" 
                 style="position:relative; padding:15px; border:1px solid rgba(212,175,55,0.1); margin-bottom:10px; cursor:pointer; background:rgba(212,175,55,0.03); border-radius:4px;">
                <div style="color:#D4AF37; font-size:11px; font-weight:bold; letter-spacing:1px;">${bm.name.toUpperCase()}</div>
                <div style="color:rgba(212,175,55,0.4); font-size:9px; margin-top:4px;">PAGE ${bm.pIdx + 1}</div>
                <div onclick="deleteBookmark(event, ${i})" 
                     style="position:absolute; top:50%; right:15px; transform:translateY(-50%); color:#ff4d4d; font-size:20px; padding:5px; opacity:0.6;">×</div>
            </div>
        `).join('');
    }
})();
