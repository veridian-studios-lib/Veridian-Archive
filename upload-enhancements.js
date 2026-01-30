/**
 * VERIDIAN SCRIPTORIUM ENHANCEMENTS
 * ---------------------------------
 * This file acts as the "Brain" for upload.html.
 * 1. Handles robust PDF extraction (fixing the blank page bug).
 * 2. Structures raw text into the Veridian data format.
 * 3. Saves to 'veridian_library' and auto-migrates any old data from 'veridian_1_library'.
 */

// --- 1. THE PDF EXTRACTOR ---
async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // UI Feedback
    const statusDisp = document.getElementById('ocr-status');
    const textArea = document.getElementById('bookContent');
    const titleInput = document.getElementById('bookTitle');

    statusDisp.innerText = "OPENING SCROLL...";
    titleInput.value = file.name.replace('.pdf', '').toUpperCase();

    const reader = new FileReader();
    reader.onload = async function() {
        try {
            const typedarray = new Uint8Array(this.result);
            
            // Connect to the PDF Worker defined in upload.html
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                statusDisp.innerText = `DECODING PAGE ${i}/${pdf.numPages}...`;
                
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                
                // --- THE FIX FOR BLANK PAGES ---
                // We map every text item and join them with a space. 
                // This prevents words from collapsing on top of each other or disappearing.
                const pageText = content.items.map(item => item.str).join(' ');
                
                fullText += pageText + "\n\n";
            }

            textArea.value = fullText.trim();
            statusDisp.innerText = fullText.trim() ? "WISDOM EXTRACTED." : "WARNING: PDF APPEARS TO BE AN IMAGE.";
            
        } catch (err) {
            statusDisp.innerText = "ERROR READING SCROLL.";
            console.error("PDF Error:", err);
            alert("This PDF is encrypted or corrupted.");
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- 2. THE ARCHIVIST (Saving & Migrating) ---
async function saveToArchive() {
    const title = document.getElementById('bookTitle').value;
    const author = document.getElementById('bookAuthor').value || "Unknown Scribe";
    const category = document.getElementById('bookCategory').value || "Other Wisdom";
    const rawContent = document.getElementById('bookContent').value;

    // Validation
    if (!title || !rawContent) {
        alert("The scroll is incomplete. Ensure Title and Content are present.");
        return;
    }

    // --- DATA STRUCTURING ---
    // 1. Split into paragraphs
    let paragraphs = rawContent.split(/\n\s*\n/).filter(p => p.trim() !== "");
    if (paragraphs.length === 0) paragraphs = [rawContent.trim()];

    // 2. Split paragraphs into sentences (for the Reader's "focus mode")
    const structuredContent = paragraphs.map(p => {
        // Regex splits by punctuation (.!?) but keeps the punctuation attached
        const sentences = p.match(/[^.!?]+[.!?]+|\S+/g) || [p];
        return sentences.map(s => s.trim());
    });

    const newBook = {
        id: "vault-" + Date.now(),
        title: title.toUpperCase(),
        author: author.toUpperCase(),
        category: category,
        content: structuredContent,
        bookmarks: [],
        lastPosition: { pIdx: 0, sIdx: 0 },
        added: Date.now()
    };

    // --- DATABASE MIGRATION LOGIC ---
    try {
        // A. Load the Main Library
        let mainLibrary = await localforage.getItem('veridian_library') || [];

        // B. Check for the old "Temporary" box (_1_)
        let oldLibrary = await localforage.getItem('veridian_1_library') || [];

        // C. MERGE: Combine Main + Old + New Book
        let combinedLibrary = [...mainLibrary, ...oldLibrary, newBook];

        // D. Filter Duplicates (by Title) to keep the archive clean
        combinedLibrary = combinedLibrary.filter((book, index, self) =>
            index === self.findIndex((b) => b.title === book.title)
        );

        // E. Save to the MASTER KEY
        await localforage.setItem('veridian_library', combinedLibrary);

        // F. Clean up the old key if it existed (Self-Correction)
        if (oldLibrary.length > 0) {
            await localforage.removeItem('veridian_1_library');
            console.log("Migration Complete: Old library merged and deleted.");
        }

        // Success Redirect
        window.location.href = 'dashboard.html';

    } catch (e) {
        console.error("Archival Failed:", e);
        alert("Critical Error: The Scribe could not save to the Vault.");
    }
}

// --- 3. INITIALIZATION ---
// This listens for when the page loads to attach the PDF listener
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        // Attach the improved PDF handler to the file input
        fileInput.addEventListener('change', handlePDFUpload);
    }
});
      
