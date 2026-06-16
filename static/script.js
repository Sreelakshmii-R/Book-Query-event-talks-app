document.addEventListener('DOMContentLoaded', () => {
    // State variables
    let allReleases = [];
    let filteredReleases = [];
    let currentCategory = 'all';
    let searchQuery = '';
    let selectedRelease = null;
    let originalTweetText = '';

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const searchInput = document.getElementById('search-input');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const resultsCount = document.getElementById('results-count');
    const notesFeed = document.getElementById('notes-feed');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    
    // Composer Elements
    const emptyComposer = document.getElementById('empty-composer');
    const activeComposer = document.getElementById('active-composer');
    const previewNoteTitle = document.getElementById('preview-note-title');
    const previewNoteDate = document.getElementById('preview-note-date');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const tweetPreviewText = document.getElementById('tweet-preview-text');
    const linkPreviewTitle = document.getElementById('link-preview-title');
    const charCounter = document.getElementById('char-counter');
    const charProgress = document.getElementById('char-progress');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const postTweetBtn = document.getElementById('post-tweet-btn');
    const helperAddTags = document.getElementById('helper-add-tags');
    const helperShorten = document.getElementById('helper-shorten');
    const helperRestore = document.getElementById('helper-restore');
    
    // Toast Elements
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Initialize the Progress Ring
    const radius = 10;
    const circumference = 2 * Math.PI * radius;
    if (charProgress) {
        charProgress.style.strokeDasharray = `${circumference} ${circumference}`;
        charProgress.style.strokeDashoffset = circumference;
    }

    // Load initial releases
    fetchReleases(false);

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        applyFilters();
    });

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.category;
            applyFilters();
        });
    });

    tweetTextarea.addEventListener('input', () => {
        updateTweetPreview();
    });

    copyTweetBtn.addEventListener('click', copyTweetToClipboard);
    postTweetBtn.addEventListener('click', postTweetToX);
    
    helperAddTags.addEventListener('click', appendHashtags);
    helperShorten.addEventListener('click', autoShortenTweet);
    helperRestore.addEventListener('click', restoreOriginalTweet);

    // Functions
    async function fetchReleases(forceRefresh = false) {
        setLoading(true);
        try {
            const url = forceRefresh ? '/api/releases?refresh=true' : '/api/releases';
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'success') {
                allReleases = data.releases;
                applyFilters();
                if (forceRefresh) {
                    showToast('Successfully fetched latest release notes!');
                }
            } else {
                throw new Error(data.message || 'Failed to fetch release notes');
            }
        } catch (error) {
            console.error(error);
            showToast(`Error: ${error.message}`, true);
            showEmptyState(true);
        } finally {
            setLoading(false);
        }
    }

    function setLoading(isLoading) {
        if (isLoading) {
            loadingState.classList.remove('hidden');
            emptyState.classList.add('hidden');
            refreshIcon.classList.add('spin');
            refreshBtn.disabled = true;
            resultsCount.textContent = 'Loading...';
        } else {
            loadingState.classList.add('hidden');
            refreshIcon.classList.remove('spin');
            refreshBtn.disabled = false;
        }
    }

    function applyFilters() {
        filteredReleases = allReleases.filter(release => {
            const matchesCategory = currentCategory === 'all' || release.category === currentCategory;
            
            // Search title and summary/content
            const matchesSearch = searchQuery === '' || 
                release.title.toLowerCase().includes(searchQuery) || 
                release.summary.toLowerCase().includes(searchQuery);
                
            return matchesCategory && matchesSearch;
        });

        resultsCount.textContent = `${filteredReleases.length} update${filteredReleases.length !== 1 ? 's' : ''}`;
        renderFeed();
    }

    function renderFeed() {
        // Clear previous notes
        const existingNotes = notesFeed.querySelectorAll('.note-card');
        existingNotes.forEach(note => note.remove());

        if (filteredReleases.length === 0) {
            showEmptyState(true);
            return;
        }

        showEmptyState(false);

        filteredReleases.forEach(release => {
            const card = document.createElement('div');
            card.className = `note-card glass-panel${selectedRelease && selectedRelease.id === release.id ? ' selected' : ''}`;
            card.id = `card-${release.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
            
            const badgeClass = `badge-${release.category.toLowerCase()}`;
            const formattedDate = formatDate(release.published || release.updated);

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title-area">
                        <div class="card-meta">
                            <span class="card-badge ${badgeClass}">${release.category}</span>
                            <span><i class="fa-regular fa-calendar"></i> ${formattedDate}</span>
                        </div>
                        <h3>${release.title}</h3>
                    </div>
                    <div class="card-actions">
                        <button class="action-icon-btn select-tweet-btn" title="Select to Tweet" aria-label="Select update to Tweet">
                            <i class="fa-brands fa-x-twitter"></i>
                        </button>
                        <button class="action-icon-btn open-link-btn" title="View Source Documentation" aria-label="View Google documentation">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    ${release.content}
                </div>
                <div class="card-footer">
                    <span class="read-more-text">Read Details <i class="fa-solid fa-chevron-down"></i></span>
                    <span class="note-id" style="font-size:10px; color:var(--text-muted); font-family:monospace;">${release.id.split('/').pop()}</span>
                </div>
            `;

            // Card click to expand/collapse (excluding button clicks)
            card.addEventListener('click', (e) => {
                const isButtonClick = e.target.closest('.action-icon-btn') || e.target.closest('a');
                if (isButtonClick) return;

                const content = card.querySelector('.card-content');
                const isExpanded = content.classList.contains('expanded');
                
                // Collapse all first (optional, for accordion feel, but let's keep it simple and just toggle this one)
                content.classList.toggle('expanded');
                card.classList.toggle('expanded');
            });

            // Select to Tweet Button Click
            const selectBtn = card.querySelector('.select-tweet-btn');
            selectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectReleaseForTweet(release, card);
            });

            // View Source Link Click
            const linkBtn = card.querySelector('.open-link-btn');
            linkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.open(release.link, '_blank');
            });

            notesFeed.appendChild(card);
        });
    }

    function showEmptyState(show) {
        if (show) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
        }
    }

    function selectReleaseForTweet(release, cardElement) {
        selectedRelease = release;
        
        // Highlight active card
        document.querySelectorAll('.note-card').forEach(card => card.classList.remove('selected'));
        cardElement.classList.add('selected');

        // Show composer
        emptyComposer.classList.add('hidden');
        activeComposer.classList.remove('hidden');

        // Populate header details
        previewNoteTitle.textContent = release.title;
        previewNoteDate.textContent = formatDate(release.published || release.updated);
        linkPreviewTitle.textContent = release.title;

        // Generate default tweet text
        generateDefaultTweet(release);
        
        // Scroll to composer on mobile
        if (window.innerWidth <= 1024) {
            activeComposer.scrollIntoView({ behavior: 'smooth' });
        }
        
        showToast('Release note selected. Customize your tweet!');
    }

    function generateDefaultTweet(release) {
        const title = release.title;
        let summary = release.summary;
        const link = release.link;
        const tags = "#BigQuery #GoogleCloud";

        // Formulate tweet structure
        // 📢 BigQuery Update: Title
        // Snippet...
        // Link Tags
        const baseIntro = `📢 BigQuery Update: ${title}\n\n`;
        const baseOutro = `\n\nRead more: ${link}\n${tags}`;
        
        const introLength = baseIntro.length;
        const outroLength = baseOutro.length;
        const maxSummaryLength = 280 - introLength - outroLength - 3; // 3 for ellipsis

        if (summary.length > maxSummaryLength) {
            summary = summary.substring(0, maxSummaryLength) + '...';
        }

        const defaultText = `${baseIntro}${summary}${baseOutro}`;
        originalTweetText = defaultText;
        tweetTextarea.value = defaultText;
        updateTweetPreview();
    }

    function updateTweetPreview() {
        const text = tweetTextarea.value;
        const charCount = text.length;
        
        // Update character counter text
        const remaining = 280 - charCount;
        charCounter.textContent = remaining;

        // Update live preview block
        tweetPreviewText.textContent = text || 'Write something...';

        // Update SVG Progress Ring
        if (charProgress) {
            const percent = Math.min(charCount / 280, 1);
            const offset = circumference - (percent * circumference);
            charProgress.style.strokeDashoffset = offset;

            // Change color as it gets full
            if (remaining < 0) {
                charProgress.style.stroke = '#ef4444'; // Red for overflow
                charCounter.style.color = '#ef4444';
                postTweetBtn.disabled = true;
            } else if (remaining <= 20) {
                charProgress.style.stroke = '#f59e0b'; // Amber warning
                charCounter.style.color = '#f59e0b';
                postTweetBtn.disabled = false;
            } else {
                charProgress.style.stroke = '#6366f1'; // Indigo normal
                charCounter.style.color = 'var(--text-muted)';
                postTweetBtn.disabled = false;
            }
        }
    }

    function appendHashtags() {
        const currentText = tweetTextarea.value;
        const tags = "#BigQuery #GoogleCloud #GCP";
        
        if (!currentText.includes("#BigQuery")) {
            tweetTextarea.value = currentText.trim() + "\n\n" + tags;
            updateTweetPreview();
            showToast('Hashtags added!');
        } else {
            showToast('Hashtags already present!');
        }
    }

    function autoShortenTweet() {
        if (!selectedRelease) return;
        
        // Generates a much shorter version
        const title = selectedRelease.title;
        const link = selectedRelease.link;
        const tags = "#BigQuery #GCP";
        
        const shortTweet = `🚀 BigQuery Update: ${title}.\n\nCheck out the full release note details at Google Cloud.\n\n🔗 ${link}\n${tags}`;
        
        tweetTextarea.value = shortTweet;
        updateTweetPreview();
        showToast('Shortened version generated!');
    }

    function restoreOriginalTweet() {
        if (!originalTweetText) return;
        tweetTextarea.value = originalTweetText;
        updateTweetPreview();
        showToast('Original text restored.');
    }

    async function copyTweetToClipboard() {
        const text = tweetTextarea.value;
        try {
            await navigator.clipboard.writeText(text);
            showToast('Tweet text copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy: ', err);
            showToast('Failed to copy to clipboard.', true);
        }
    }

    function postTweetToX() {
        const text = tweetTextarea.value;
        if (text.length > 280) {
            showToast('Tweet is too long! Please shorten it.', true);
            return;
        }
        
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterIntentUrl, '_blank');
        showToast('Opening X / Twitter...');
    }

    // Helper Utility: Date Formatting (converts XML timestamps to readable dates)
    function formatDate(dateStr) {
        if (!dateStr) return 'Recent Update';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    // Helper Utility: Toast Notification
    let toastTimeout = null;
    function showToast(message, isError = false) {
        if (toastTimeout) clearTimeout(toastTimeout);
        
        toastMessage.textContent = message;
        const icon = toast.querySelector('i');
        
        if (isError) {
            icon.className = 'fa-solid fa-triangle-exclamation';
            icon.style.color = 'var(--color-deprecation)';
            toast.style.borderColor = 'var(--color-deprecation)';
        } else {
            icon.className = 'fa-solid fa-circle-check';
            icon.style.color = 'var(--color-feature)';
            toast.style.borderColor = 'var(--accent-primary)';
        }

        toast.classList.remove('hidden');
        
        toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
});
