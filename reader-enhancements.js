/**
 * Veridian Archive Companion Script
 * Handles Auto-Resume and Bookmarking without modifying reader.html
 */

(function() {
    // 1. AUTO-RESUME LOGIC
    // We wait for the Sanctum to start, then check for a saved position
    const originalStartSanctum = window.startSanctum;
    window.startSanctum = async function() {
        await originalStartSanctum();
        
        const library = await localforage.getItem('veridian_library') || [];
        const book = library.find(b => b.id === currentMetadata.id);
        
        if (book && book.lastPosition) {
            console.log("Resuming from saved position...");
            window.pIdx = book.lastPosition.pIdx;
            window.sIdx = book.lastPosition.sIdx;
            window.render(); // Redraw page at saved spot
        }
    };

    // 2. AUTO-SAVE LOGIC
    // We wrap the original render and logProgress functions to save state whenever they run
    const originalLogProgress = window.logProgress;
    window.logProgress = async function(text) {
        await originalLogProgress(text);
        saveState();
    };

    async function saveState() {
        let library = await localforage.getItem('veridian_library') || [];
        const index = library.findIndex(b => b.id === currentMetadata.id);
        if (index !== -1) {
            library[index].lastPosition = { pIdx: window.pIdx, sIdx: window.sIdx };
            library[index].bookmarks = currentMetadata.bookmarks || [];
            await localforage.setItem('veridian_library', library);
        }
    }

    // 3. BOOKMARK LOGIC
    // This adds a simple keyboard shortcut 'B' to bookmark, since we aren't changing the HTML buttons
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'b') {
            addQuickBookmark();
        }
    });

    window.addQuickBookmark = async function() {
        const name = prompt("Name this bookmark:", `Page ${window.pIdx + 1}, Line ${window.sIdx + 1}`);
        if (!name) return;

        if (!currentMetadata.bookmarks) currentMetadata.bookmarks = [];
        currentMetadata.bookmarks.push({
            name,
            pIdx: window.pIdx,
            sIdx: window.sIdx,
            time: new Date().toLocaleDateString()
        });

        await saveState();
        alert("Inscription saved to the Archive.");
    };
})();
