// script.js – CineHub Upgraded Version
// Features: Search suggestions, Recently Viewed, Download counter,
//           Cookie consent, Dark/Light mode, Mobile bottom nav,
//           Movie recommendations, Share button, New Releases section

// ================= CONFIG =================
const API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let currentPage = 1;
let currentGenre = '';
let currentYear = '';
let currentRating = '';
let currentSearch = '';
let isGridView = true;
let allMovies = [];
let currentMovie = null;
let searchTimeout = null;

const els = {
    moviesGrid: document.getElementById('moviesGrid'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    genreFilter: document.getElementById('genreFilter'),
    yearFilter: document.getElementById('yearFilter'),
    ratingFilter: document.getElementById('ratingFilter'),
    gridView: document.getElementById('gridView'),
    listView: document.getElementById('listView'),
    movieModal: document.getElementById('movieModal'),
    modalClose: document.querySelector('.close'),
    exploreBtn: document.getElementById('exploreBtn'),
    trendingBtn: document.getElementById('trendingBtn'),
    hamburger: document.querySelector('.hamburger'),
    navMenu: document.querySelector('.nav-menu'),
    trendingGrid: document.getElementById('trendingGrid'),
    gridViewTrending: document.getElementById('gridViewTrending'),
    listViewTrending: document.getElementById('listViewTrending'),
    animationGrid: document.getElementById('animationGrid'),
    gridViewAnimation: document.getElementById('gridViewAnimation'),
    listViewAnimation: document.getElementById('listViewAnimation'),
    clearWatchlistBtn: document.getElementById('clearWatchlistBtn')
};

document.addEventListener('DOMContentLoaded', () => {
    loadPopularMovies();
    setupEventListeners();
    injectExtraUI();
    initDarkMode();
    initCookieConsent();
    initMobileNav();

    const savedSection = window.location.hash.substring(1) || 'movies';
    switchSection(savedSection);
});

// ================= EXTRA UI INJECTION =================
function injectExtraUI() {
    // Search suggestions dropdown
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
        const suggestions = document.createElement('div');
        suggestions.id = 'searchSuggestions';
        suggestions.style.cssText = `
            position:absolute;top:100%;left:0;right:0;background:#1a1a1a;
            border:1px solid #333;border-top:none;border-radius:0 0 8px 8px;
            z-index:500;max-height:300px;overflow-y:auto;display:none;
        `;
        searchContainer.style.position = 'relative';
        searchContainer.appendChild(suggestions);
    }

    // Dark/Light mode toggle button in nav
    const navActions = document.querySelector('.nav-actions');
    if (navActions) {
        const modeBtn = document.createElement('button');
        modeBtn.id = 'modeToggle';
        modeBtn.title = 'Toggle Dark/Light Mode';
        modeBtn.style.cssText = `
            background:none;border:1px solid #333;color:white;
            padding:0.5rem 0.75rem;border-radius:8px;cursor:pointer;
            font-size:1rem;margin-left:0.5rem;transition:all 0.3s;
        `;
        modeBtn.innerHTML = '🌙';
        modeBtn.onclick = toggleDarkMode;
        navActions.appendChild(modeBtn);
    }

    // Share button in modal actions
    const modalActions = document.querySelector('.movie-actions');
    if (modalActions) {
        const shareBtn = document.createElement('button');
        shareBtn.id = 'shareBtn';
        shareBtn.className = 'btn btn-secondary';
        shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> Share';
        shareBtn.onclick = shareMovie;
        modalActions.appendChild(shareBtn);
    }

    // Recently Viewed section
    const moviesMain = document.getElementById('movies');
    if (moviesMain) {
        const recentSection = document.createElement('div');
        recentSection.id = 'recentlyViewedSection';
        recentSection.style.cssText = 'margin-bottom:2rem;display:none;';
        recentSection.innerHTML = `
            <div class="section-header" style="margin-bottom:1rem;">
                <h2 class="section-title" style="font-size:1.4rem;">Recently Viewed</h2>
                <button onclick="clearRecentlyViewed()" style="background:none;border:1px solid #333;color:#aaa;padding:0.4rem 0.8rem;border-radius:6px;cursor:pointer;font-size:0.85rem;">Clear</button>
            </div>
            <div id="recentlyViewedGrid" class="movies-grid"></div>
        `;
        moviesMain.querySelector('.container').insertBefore(recentSection, moviesMain.querySelector('.section-header'));
    }

    // Download counter display in modal
    const movieInfo = document.querySelector('.movie-info');
    if (movieInfo) {
        const counterDiv = document.createElement('div');
        counterDiv.id = 'downloadCounter';
        counterDiv.style.cssText = 'color:#aaa;font-size:0.85rem;margin-top:0.5rem;display:none;';
        counterDiv.innerHTML = '<i class="fas fa-download"></i> <span id="dlCountNum">0</span> downloads';
        movieInfo.appendChild(counterDiv);
    }

    // Recommendations section in modal
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
        const recsDiv = document.createElement('div');
        recsDiv.id = 'modalRecommendations';
        recsDiv.style.cssText = 'margin-top:2rem;display:none;';
        recsDiv.innerHTML = `
            <h3 style="font-size:1.1rem;margin-bottom:1rem;color:white;">You Might Also Like</h3>
            <div id="recsGrid" class="movies-grid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:0.8rem;"></div>
        `;
        modalContent.appendChild(recsDiv);
    }

    // Cookie consent banner
    const cookieBanner = document.createElement('div');
    cookieBanner.id = 'cookieBanner';
    cookieBanner.style.cssText = `
        position:fixed;bottom:0;left:0;right:0;background:#111;border-top:1px solid #333;
        padding:1rem 1.5rem;z-index:9000;display:flex;align-items:center;justify-content:space-between;
        flex-wrap:wrap;gap:1rem;transform:translateY(100%);transition:transform 0.4s ease;
    `;
    cookieBanner.innerHTML = `
        <p style="color:#ccc;font-size:0.9rem;margin:0;flex:1;">
            🍪 We use cookies to enhance your experience. 
            <a href="cookie.html" style="color:#e50914;">Learn more</a>
        </p>
        <div style="display:flex;gap:0.75rem;">
            <button onclick="acceptCookies()" style="background:#e50914;color:white;border:none;padding:0.6rem 1.2rem;border-radius:6px;cursor:pointer;font-weight:600;">Accept</button>
            <button onclick="declineCookies()" style="background:transparent;color:#aaa;border:1px solid #333;padding:0.6rem 1.2rem;border-radius:6px;cursor:pointer;">Decline</button>
        </div>
    `;
    document.body.appendChild(cookieBanner);
}

// ================= DARK / LIGHT MODE =================
function initDarkMode() {
    const mode = localStorage.getItem('cinehub_mode') || 'dark';
    applyMode(mode);
}

function toggleDarkMode() {
    const current = localStorage.getItem('cinehub_mode') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('cinehub_mode', next);
    applyMode(next);
}

function applyMode(mode) {
    const btn = document.getElementById('modeToggle');
    if (mode === 'light') {
        document.body.style.background = '#f5f5f5';
        document.body.style.color = '#111';
        if (btn) btn.innerHTML = '☀️';
        document.querySelectorAll('.movie-card, .modal-content, .filter-section, .header').forEach(el => {
            el.style.background = '#ffffff';
            el.style.color = '#111';
        });
    } else {
        document.body.style.background = '#0a0a0a';
        document.body.style.color = '#e0e0e0';
        if (btn) btn.innerHTML = '🌙';
        document.querySelectorAll('.movie-card, .modal-content, .filter-section, .header').forEach(el => {
            el.style.background = '';
            el.style.color = '';
        });
    }
}

// ================= COOKIE CONSENT =================
function initCookieConsent() {
    if (!localStorage.getItem('cinehub_cookies')) {
        setTimeout(() => {
            const banner = document.getElementById('cookieBanner');
            if (banner) banner.style.transform = 'translateY(0)';
        }, 2000);
    }
}

function acceptCookies() {
    localStorage.setItem('cinehub_cookies', 'accepted');
    hideCookieBanner();
    showNotification('Cookie preferences saved ✓');
}

function declineCookies() {
    localStorage.setItem('cinehub_cookies', 'declined');
    hideCookieBanner();
}

function hideCookieBanner() {
    const banner = document.getElementById('cookieBanner');
    if (banner) banner.style.transform = 'translateY(100%)';
}

// ================= RECENTLY VIEWED =================
function addToRecentlyViewed(movie) {
    let recent = JSON.parse(localStorage.getItem('cinehub_recent')) || [];
    recent = recent.filter(m => m.id !== movie.id);
    recent.unshift({ id: movie.id, title: movie.title, poster_path: movie.poster_path, vote_average: movie.vote_average, release_date: movie.release_date });
    if (recent.length > 10) recent = recent.slice(0, 10);
    localStorage.setItem('cinehub_recent', JSON.stringify(recent));
    renderRecentlyViewed();
}

function renderRecentlyViewed() {
    const recent = JSON.parse(localStorage.getItem('cinehub_recent')) || [];
    const section = document.getElementById('recentlyViewedSection');
    const grid = document.getElementById('recentlyViewedGrid');
    if (!section || !grid) return;
    if (recent.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    grid.innerHTML = recent.map(m => createMovieCard(m)).join('');
    grid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => showMovieDetails(card.dataset.movieId));
    });
}

function clearRecentlyViewed() {
    localStorage.removeItem('cinehub_recent');
    renderRecentlyViewed();
    showNotification('Recently viewed cleared');
}

// ================= DOWNLOAD COUNTER =================
function incrementDownloadCount(movieId) {
    const key = `cinehub_dl_${movieId}`;
    const count = parseInt(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, count);
    return count;
}

function getDownloadCount(movieId) {
    return parseInt(localStorage.getItem(`cinehub_dl_${movieId}`) || '0');
}

function updateDownloadCounterDisplay(movieId) {
    const counter = document.getElementById('downloadCounter');
    const num = document.getElementById('dlCountNum');
    if (counter && num) {
        const count = getDownloadCount(movieId);
        num.textContent = count;
        counter.style.display = count > 0 ? 'block' : 'none';
    }
}

// ================= SHARE =================
function shareMovie() {
    if (!currentMovie) return;
    const url = `${window.location.origin}${window.location.pathname}#movies`;
    const text = `Check out ${currentMovie.title} on CineHub!`;
    if (navigator.share) {
        navigator.share({ title: currentMovie.title, text, url }).catch(() => {});
    } else {
        navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
            showNotification('Link copied to clipboard! 📋');
        }).catch(() => {
            showNotification('Share: ' + url);
        });
    }
}

// ================= SEARCH SUGGESTIONS =================
function showSearchSuggestions(query) {
    const box = document.getElementById('searchSuggestions');
    if (!box) return;
    if (!query || query.length < 2) { box.style.display = 'none'; return; }

    const matches = allMovies.filter(m => m.title?.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
    if (!matches.length) { box.style.display = 'none'; return; }

    box.innerHTML = matches.map(m => `
        <div onclick="selectSuggestion('${m.id}', '${m.title.replace(/'/g, "\\'")}')" style="
            padding:0.75rem 1rem;cursor:pointer;display:flex;align-items:center;gap:0.75rem;
            border-bottom:1px solid #222;transition:background 0.2s;
        " onmouseover="this.style.background='#252525'" onmouseout="this.style.background='none'">
            <img src="${m.poster_path ? IMAGE_BASE_URL + m.poster_path : 'https://via.placeholder.com/30x45'}" 
                 style="width:30px;height:45px;object-fit:cover;border-radius:3px;" loading="lazy">
            <div>
                <div style="color:white;font-size:0.9rem;">${m.title}</div>
                <div style="color:#888;font-size:0.75rem;">${m.release_date?.slice(0,4) || 'N/A'} · ⭐ ${m.vote_average?.toFixed(1) || 'N/A'}</div>
            </div>
        </div>
    `).join('');
    box.style.display = 'block';
}

function selectSuggestion(id, title) {
    const box = document.getElementById('searchSuggestions');
    if (box) box.style.display = 'none';
    if (els.searchInput) els.searchInput.value = title;
    showMovieDetails(id);
}

// ================= MOBILE BOTTOM NAV =================
function initMobileNav() {
    const mobileNav = document.createElement('nav');
    mobileNav.id = 'mobileBottomNav';
    mobileNav.style.cssText = `
        display:none;position:fixed;bottom:0;left:0;right:0;background:#111;
        border-top:1px solid #333;z-index:8000;padding:0.5rem 0;
        grid-template-columns:repeat(5,1fr);
    `;
    mobileNav.innerHTML = `
        <button onclick="switchSection('movies')" class="mob-nav-btn" data-section="movies">
            <i class="fas fa-home"></i><span>Home</span>
        </button>
        <button onclick="switchSection('movies')" class="mob-nav-btn" data-section="movies-tab">
            <i class="fas fa-film"></i><span>Movies</span>
        </button>
        <button onclick="switchSection('trending')" class="mob-nav-btn" data-section="trending">
            <i class="fas fa-fire"></i><span>Trending</span>
        </button>
        <button onclick="switchSection('animation')" class="mob-nav-btn" data-section="animation">
            <i class="fas fa-dragon"></i><span>Animation</span>
        </button>
        <button onclick="switchSection('watchlist')" class="mob-nav-btn" data-section="watchlist">
            <i class="fas fa-bookmark"></i><span>Watchlist</span>
        </button>
    `;
    document.body.appendChild(mobileNav);

    const style = document.createElement('style');
    style.textContent = `
        #mobileBottomNav { display:none; }
        @media(max-width:768px) {
            #mobileBottomNav { display:grid !important; }
            body { padding-bottom:70px; }
        }
        .mob-nav-btn {
            background:none;border:none;color:#888;cursor:pointer;
            display:flex;flex-direction:column;align-items:center;gap:3px;
            font-size:0.65rem;padding:0.4rem 0;transition:color 0.2s;
        }
        .mob-nav-btn i { font-size:1.2rem; }
        .mob-nav-btn.active, .mob-nav-btn:hover { color:#e50914; }
    `;
    document.head.appendChild(style);
}

function updateMobileNav(section) {
    document.querySelectorAll('.mob-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === section);
    });
}

// ================= RECOMMENDATIONS =================
async function loadRecommendations(movieId) {
    try {
        const res = await fetch(`${BASE_URL}/movie/${movieId}/recommendations?api_key=${API_KEY}&language=en-US&page=1`);
        const data = await res.json();
        const recs = (data.results || []).slice(0, 6);
        const recsDiv = document.getElementById('modalRecommendations');
        const recsGrid = document.getElementById('recsGrid');
        if (!recsDiv || !recsGrid || !recs.length) return;

        recsGrid.innerHTML = recs.map(m => `
            <div class="movie-card" data-movie-id="${m.id}" onclick="showMovieDetails('${m.id}')" style="cursor:pointer;">
                <img src="${m.poster_path ? IMAGE_BASE_URL + m.poster_path : 'https://via.placeholder.com/110x165'}" 
                     class="movie-poster" loading="lazy" style="border-radius:6px;">
                <div class="movie-info" style="padding:0.5rem;">
                    <h3 class="movie-title" style="font-size:0.75rem;">${m.title}</h3>
                </div>
            </div>
        `).join('');
        recsDiv.style.display = 'block';
    } catch(e) {
        console.warn('Recommendations failed:', e);
    }
}

// ================= SETUP EVENT LISTENERS =================
function setupEventListeners() {
    els.searchBtn.addEventListener('click', handleSearch);
    els.searchInput.addEventListener('keypress', e => e.key === 'Enter' && handleSearch());

    // Search suggestions with debounce
    els.searchInput.addEventListener('input', e => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => showSearchSuggestions(e.target.value), 250);
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', e => {
        if (!e.target.closest('.search-container')) {
            const box = document.getElementById('searchSuggestions');
            if (box) box.style.display = 'none';
        }
    });

    els.genreFilter.addEventListener('change', handleFilterChange);
    els.yearFilter.addEventListener('change', handleFilterChange);
    els.ratingFilter.addEventListener('change', handleFilterChange);

    els.gridView.addEventListener('click', () => setViewMode('grid'));
    els.listView.addEventListener('click', () => setViewMode('list'));

    if (els.gridViewTrending) els.gridViewTrending.addEventListener('click', () => setViewMode('grid'));
    if (els.listViewTrending) els.listViewTrending.addEventListener('click', () => setViewMode('list'));
    if (els.gridViewAnimation) els.gridViewAnimation.addEventListener('click', () => setViewMode('grid'));
    if (els.listViewAnimation) els.listViewAnimation.addEventListener('click', () => setViewMode('list'));

    els.loadMoreBtn.addEventListener('click', loadMoreMovies);
    els.modalClose.addEventListener('click', closeModal);
    window.addEventListener('click', e => e.target === els.movieModal && closeModal());

    els.exploreBtn.addEventListener('click', () => document.getElementById('movies').scrollIntoView({ behavior: 'smooth' }));
    els.trendingBtn.addEventListener('click', loadTrendingMovies);
    els.hamburger.addEventListener('click', () => els.navMenu.classList.toggle('active'));

    if (els.clearWatchlistBtn) {
        els.clearWatchlistBtn.addEventListener('click', () => {
            if (confirm('Clear entire watchlist?')) {
                localStorage.removeItem('watchlist');
                renderWatchlist();
            }
        });
    }

    document.addEventListener('click', e => {
        if (e.target.closest('.trailer-btn')) {
            if (e.target.closest('#watchlistGrid')) return;
            if (!currentMovie) { alert('No movie selected'); return; }
            const { id, title, release_date } = currentMovie;
            const year = release_date ? release_date.slice(0, 4) : 'N/A';
            getMovieTrailer(id, title, year).then(trailer => {
                if (trailer) displayTrailer(trailer);
                else alert('No trailer available');
            }).catch(err => { console.error(err); alert('Error loading trailer'); });
        }
    });

    document.addEventListener('click', e => {
        if (e.target.closest('.watchlist-btn')) {
            const card = e.target.closest('.movie-card');
            const movieId = card ? parseInt(card.dataset.movieId) : currentMovie ? currentMovie.id : null;
            if (movieId) toggleWatchlist(movieId);
        }
    });
}

// ================= SECTION SWITCHING =================
function switchSection(sectionId) {
    document.querySelectorAll('section, main').forEach(s => s.style.display = 'none');
    const target = document.getElementById(sectionId);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
    if (activeLink) activeLink.classList.add('active');
    updateMobileNav(sectionId);

    if (sectionId === 'home' || sectionId === 'movies') {
        document.getElementById('movies').style.display = 'block';
        if (allMovies.length === 0) loadPopularMovies();
        else { displayMovies(allMovies); renderRecentlyViewed(); }
    }
    if (sectionId === 'trending') loadTrendingMovies();
    if (sectionId === 'animation') loadAnimations();
    if (sectionId === 'watchlist') renderWatchlist();
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.getAttribute('href').substring(1);
        switchSection(sectionId);
    });
});

document.querySelector('.nav-logo').addEventListener('click', () => switchSection('movies'));

// ================= WATCHLIST =================
function toggleWatchlist(movieId) {
    let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
    if (watchlist.includes(movieId)) {
        watchlist = watchlist.filter(id => id !== movieId);
        showNotification('Removed from Watchlist');
    } else {
        watchlist.push(movieId);
        showNotification('Added to Watchlist ✓');
    }
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    const watchlistBtn = document.querySelector('.watchlist-btn');
    if (watchlistBtn) {
        const isInWatchlist = watchlist.includes(movieId);
        watchlistBtn.innerHTML = isInWatchlist ? '<i class="fas fa-minus"></i> Remove from Watchlist' : '<i class="fas fa-plus"></i> Add to Watchlist';
    }
    if (document.getElementById('watchlist').style.display === 'block') renderWatchlist();
}

async function renderWatchlist() {
    const ids = JSON.parse(localStorage.getItem('watchlist')) || [];
    const grid = document.getElementById('watchlistGrid');
    const empty = document.getElementById('watchlistEmpty');
    if (ids.length === 0) { empty.style.display = 'block'; grid.innerHTML = ''; return; }
    empty.style.display = 'none';

    // Check local series/animation data first
    const localMovies = ids.map(id => {
        if (window.seriesData?.[id]) return { ...window.seriesData[id], _isSeries: true };
        if (window.animationData?.[id]) return { ...window.animationData[id], _isAnimation: true };
        return null;
    }).filter(Boolean);

    const remoteIds = ids.filter(id => !window.seriesData?.[id] && !window.animationData?.[id]);
    const fetched = await Promise.all(remoteIds.map(id =>
        fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`).then(r => r.json()).catch(() => null)
    ));

    const all = [...localMovies, ...fetched.filter(m => m && !m.status_message)];
    grid.innerHTML = all.map(createMovieCard).join('');
    grid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => showMovieDetails(card.dataset.movieId));
    });
}

// ================= LOAD MOVIES =================
async function loadPopularMovies() {
    showLoading(true);
    try {
        const movieIds = Object.keys(window.downloadLinks || {}).map(Number);
        const seriesList = Object.values(window.seriesData || {}).map(s => ({
            id: s.id, title: s.title, poster_path: s.poster_path,
            release_date: '2019-01-01', vote_average: 8.5, _isSeries: true
        }));
        const animList = Object.values(window.animationData || {}).map(a => ({
            id: a.id, title: a.title, poster_path: a.poster_path,
            release_date: '2021-01-01', vote_average: 8.7, _isAnimation: true
        }));

        const fetched = await Promise.all(movieIds.map(id =>
            fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`).then(r => r.json()).catch(() => null)
        ));
        const validMovies = fetched.filter(m => m && !m.status_message);
        allMovies = [...seriesList, ...animList, ...validMovies];
        displayMovies(allMovies);
        renderRecentlyViewed();
    } catch(e) {
        showFallbackContent();
    }
    showLoading(false);
}

async function loadTrendingMovies() {
    const grid = document.getElementById('trendingGrid');
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center;padding:3rem;color:#e50914;font-size:2rem;"><i class="fas fa-spinner fa-spin"></i></div>';
    try {
        const movieIds = Object.keys(window.downloadLinks || {}).map(Number);
        const fetched = await Promise.all(movieIds.map(id =>
            fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`).then(r => r.json()).catch(() => null)
        ));
        const valid = fetched.filter(m => m && !m.status_message);
        grid.innerHTML = valid.map(createMovieCard).join('');
        grid.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', () => showMovieDetails(card.dataset.movieId));
        });
    } catch(e) {
        grid.innerHTML = '<p style="text-align:center;padding:3rem;color:#888;">Could not load trending movies.</p>';
    }
}

function loadAnimations() {
    const grid = document.getElementById('animationGrid');
    if (!grid) return;
    const animList = Object.values(window.animationData || {}).map(a => ({
        id: a.id, title: a.title, poster_path: a.poster_path,
        release_date: '2021-01-01', vote_average: 8.7, _isAnimation: true
    }));
    grid.innerHTML = animList.map(createMovieCard).join('');
    grid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => showMovieDetails(card.dataset.movieId));
    });
}

function loadMoreMovies() {
    els.loadMoreBtn.style.display = 'none';
}

function showFallbackContent() {
    if (els.moviesGrid) els.moviesGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:#888;">Could not load movies. Please refresh.</p>';
    if (els.loadMoreBtn) els.loadMoreBtn.style.display = 'none';
}

// ================= FILTER & SEARCH =================
function handleFilterChange() {
    currentGenre = els.genreFilter.value;
    currentYear = els.yearFilter.value;
    currentRating = els.ratingFilter.value;
    let filtered = [...allMovies];
    if (currentGenre) filtered = filtered.filter(m => m.genre_ids?.includes(parseInt(currentGenre)));
    if (currentYear) filtered = filtered.filter(m => m.release_date?.startsWith(currentYear));
    if (currentRating) filtered = filtered.filter(m => m.vote_average >= parseFloat(currentRating));
    displayMovies(filtered.length ? filtered : allMovies);
}

function handleSearch() {
    const query = els.searchInput.value.trim().toLowerCase();
    const box = document.getElementById('searchSuggestions');
    if (box) box.style.display = 'none';
    if (!query) { displayMovies(allMovies); return; }
    currentSearch = query;
    const filtered = allMovies.filter(m => m.title?.toLowerCase().includes(query));
    displayMovies(filtered.length ? filtered : allMovies);
    switchSection('movies');
}

// ================= VIEW MODE =================
function setViewMode(mode) {
    isGridView = mode === 'grid';
    document.querySelectorAll('.movies-grid').forEach(g => {
        g.style.gridTemplateColumns = isGridView
            ? 'repeat(auto-fill, minmax(165px, 1fr))'
            : 'repeat(auto-fill, minmax(100%, 1fr))';
    });
    document.querySelectorAll('.view-btn').forEach((btn, i) => {
        btn.classList.toggle('active', (isGridView && i % 2 === 0) || (!isGridView && i % 2 === 1));
    });
}

// ================= MOVIE DETAILS =================
async function showMovieDetails(movieId) {
    movieId = parseInt(movieId);

    // Check local data first
    if (window.seriesData?.[movieId]) { showSeriesModal(window.seriesData[movieId]); return; }
    if (window.animationData?.[movieId]) { showSeriesModal(window.animationData[movieId]); return; }

    try {
        const movie = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&append_to_response=credits`).then(r => r.json());
        currentMovie = movie;
        addToRecentlyViewed(movie);
        populateModal(movie);
        loadRecommendations(movieId);
        updateDownloadCounterDisplay(movieId);
    } catch(e) {
        showNotification('Could not load movie details.');
    }
}

function populateModal(movie) {
    document.getElementById('modalPoster').src = movie.poster_path
        ? IMAGE_BASE_URL + movie.poster_path
        : 'https://via.placeholder.com/300x450?text=No+Poster';
    document.getElementById('modalTitle').textContent = movie.title;
    document.getElementById('modalYear').textContent = movie.release_date?.slice(0,4) || 'N/A';
    document.getElementById('modalRuntime').textContent = movie.runtime
        ? `${Math.floor(movie.runtime/60)}hr ${movie.runtime%60}mins` : 'N/A';
    document.getElementById('modalRating').textContent = movie.vote_average ? `⭐ ${movie.vote_average.toFixed(1)}` : 'N/A';
    document.getElementById('modalOverview').textContent = movie.overview || 'No overview available.';
    document.getElementById('modalGenres').innerHTML = movie.genres?.map(g => `<span class="genre-tag">${g.name}</span>`).join('') || '';

    const cast = movie.credits?.cast?.slice(0,6) || [];
    document.getElementById('modalCast').innerHTML = cast.map(c => `
        <div class="cast-member">
            <img src="${c.profile_path ? IMAGE_BASE_URL + c.profile_path : 'https://via.placeholder.com/60'}" alt="${c.name}">
            <p>${c.name}</p>
        </div>
    `).join('') || '<p>No cast info available.</p>';

    // Hide recommendations until loaded
    const recsDiv = document.getElementById('modalRecommendations');
    if (recsDiv) recsDiv.style.display = 'none';

    els.movieModal.style.display = 'flex';

    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.style.display = 'inline-flex';
        downloadBtn.onclick = () => {
            if (window.downloadLinks?.[movie.id]) {
                incrementDownloadCount(movie.id);
                updateDownloadCounterDisplay(movie.id);
                window.open(`download.html?id=${movie.id}`, '_blank');
            } else {
                showNotification('No download link available yet.');
            }
        };
    }

    const watchlistBtn = document.querySelector('.watchlist-btn');
    if (watchlistBtn) {
        const watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
        watchlistBtn.innerHTML = watchlist.includes(movie.id)
            ? '<i class="fas fa-minus"></i> Remove from Watchlist'
            : '<i class="fas fa-plus"></i> Add to Watchlist';
    }
}

function showSeriesModal(series) {
    currentMovie = series;
    document.getElementById('modalPoster').src = series.poster_path
        ? IMAGE_BASE_URL + series.poster_path
        : 'https://via.placeholder.com/300x450?text=No+Poster';
    document.getElementById('modalTitle').textContent = series.title;
    document.getElementById('modalYear').textContent = 'Series';
    document.getElementById('modalRuntime').textContent = 'Multiple Episodes';
    document.getElementById('modalRating').textContent = '⭐ N/A';
    document.getElementById('modalOverview').textContent = 'Select a season below to view and download episodes.';
    document.getElementById('modalGenres').innerHTML = '';
    document.getElementById('downloadBtn').style.display = 'none';

    const recsDiv = document.getElementById('modalRecommendations');
    if (recsDiv) recsDiv.style.display = 'none';

    const seasonNums = Object.keys(series.seasons || {}).sort((a,b) => a-b);
    document.getElementById('modalCast').innerHTML = `
        <div style="width:100%;">
            <select class="season-dropdown-select" onchange="showEpisodes('${series.id}', this.value)" style="width:100%;margin-bottom:1rem;">
                <option value="">-- Select a Season --</option>
                ${seasonNums.map(s => `<option value="${s}">Season ${s}</option>`).join('')}
            </select>
            <div id="episodesContainer"></div>
        </div>
    `;
    els.movieModal.style.display = 'flex';

    const watchlistBtn = document.querySelector('.watchlist-btn');
    if (watchlistBtn) {
        const watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
        watchlistBtn.innerHTML = watchlist.includes(series.id)
            ? '<i class="fas fa-minus"></i> Remove from Watchlist'
            : '<i class="fas fa-plus"></i> Add to Watchlist';
    }
}

function showEpisodes(seriesId, seasonNum) {
    const container = document.getElementById('episodesContainer');
    if (!container || !seasonNum) return;
    const series = window.seriesData?.[seriesId] || window.animationData?.[seriesId];
    if (!series?.seasons?.[seasonNum]) { container.innerHTML = '<p style="color:#888;padding:1rem">No episodes found.</p>'; return; }
    const eps = series.seasons[seasonNum];
    container.innerHTML = `
        <div class="season-episodes-display">
            <h4 style="padding:1rem;color:#e50914;border-bottom:1px solid #222;">Season ${seasonNum} Episodes</h4>
            ${Object.keys(eps).sort((a,b)=>a-b).map(ep => `
                <div class="episode-item">
                    <span class="episode-number">Episode ${ep}</span>
                    <button class="episode-download-btn" onclick="handleEpisodeDownload('${eps[ep]}', ${seriesId}, ${ep})">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

function handleEpisodeDownload(url, seriesId, episode) {
    incrementDownloadCount(`${seriesId}_ep${episode}`);
    window.open(url, '_blank');
}

function closeModal() {
    els.movieModal.style.display = 'none';
    currentMovie = null;
    const recsDiv = document.getElementById('modalRecommendations');
    if (recsDiv) recsDiv.style.display = 'none';
}

// ================= DISPLAY =================
function displayMovies(movies) {
    if (!movies?.length) {
        els.moviesGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:#888;">No movies found</p>';
        els.loadMoreBtn.style.display = 'none';
        return;
    }
    els.moviesGrid.innerHTML = movies.map(createMovieCard).join('');
    els.loadMoreBtn.style.display = 'none';
    els.moviesGrid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => showMovieDetails(card.dataset.movieId));
    });
}

function createMovieCard(movie) {
    const poster = movie.poster_path
        ? IMAGE_BASE_URL + movie.poster_path
        : 'https://via.placeholder.com/200x300?text=No+Poster';
    const year = movie.release_date ? movie.release_date.slice(0,4) : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const badge = movie._isSeries
        ? '<span style="background:#e50914;color:white;font-size:0.65rem;padding:2px 6px;border-radius:3px;margin-top:4px;display:inline-block;">SERIES</span>'
        : movie._isAnimation
        ? '<span style="background:#3498db;color:white;font-size:0.65rem;padding:2px 6px;border-radius:3px;margin-top:4px;display:inline-block;">ANIMATION</span>'
        : '';
    return `
        <div class="movie-card" data-movie-id="${movie.id}">
            <img src="${poster}" alt="${movie.title}" class="movie-poster" loading="lazy">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <span>${year}</span>
                    <span class="rating">⭐ ${rating}</span>
                </div>
                ${badge}
            </div>
        </div>
    `;
}

function showLoading(show) {
    if (els.loadingSpinner) els.loadingSpinner.style.display = show ? 'block' : 'none';
}

// ================= NOTIFICATIONS =================
function showNotification(message) {
    const n = document.createElement('div');
    n.className = 'notification';
    n.textContent = message;
    n.style.cssText = `
        position:fixed;top:20px;right:20px;background:#e50914;color:white;
        padding:1rem 1.5rem;border-radius:8px;z-index:9999;
        font-family:system-ui,sans-serif;font-weight:600;
        animation:slideIn 0.3s ease;box-shadow:0 4px 15px rgba(229,9,20,0.4);
    `;
    document.body.appendChild(n);
    setTimeout(() => {
        n.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => n.remove(), 300);
    }, 3000);
}

if (!document.getElementById('notification-styles')) {
    const s = document.createElement('style');
    s.id = 'notification-styles';
    s.textContent = `
        @keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes slideOut { from{transform:translateX(0);opacity:1} to{transform:translateX(100%);opacity:0} }
        .genre-tag { background:#1a1a1a;border:1px solid #444;border-radius:20px;padding:0.3rem 0.9rem;font-size:0.8rem;display:inline-block;margin:2px; }
    `;
    document.head.appendChild(s);
}

// ================= TRAILERS =================
async function getMovieTrailer(movieId, title, year) {
    try {
        const res = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}&language=en-US`);
        if (res.ok) {
            const { results } = await res.json();
            let t = results.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official);
            if (t) return { source: 'youtube', key: t.key, name: t.name || 'Official Trailer' };
            t = results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            if (t) return { source: 'youtube', key: t.key, name: t.name || 'Trailer' };
        }
        return null;
    } catch(e) { return null; }
}

function displayTrailer(trailer) {
    if (!trailer || trailer.source !== 'youtube') { showNotification('No trailer available'); return; }
    const modal = document.createElement('div');
    modal.className = 'trailer-modal';
    modal.innerHTML = `
        <div class="trailer-modal-content">
            <span class="trailer-close">×</span>
            <div class="trailer-container">
                <iframe src="https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&controls=1&rel=0&modestbranding=1&playsinline=1"
                    title="${trailer.name}" frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowfullscreen></iframe>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    const close = () => { document.body.removeChild(modal); document.body.style.overflow = ''; };
    modal.querySelector('.trailer-close').onclick = close;
    modal.onclick = e => e.target === modal && close();
}
