// script.js – Final consolidated version (all trailer logic merged)
// ONLY ONE LINE CHANGED: runtime format updated to hours and minutes

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
    // Added for trending section
    trendingGrid: document.getElementById('trendingGrid'),
    gridViewTrending: document.getElementById('gridViewTrending'),
    listViewTrending: document.getElementById('listViewTrending'),
    // Added for animation section
    animationGrid: document.getElementById('animationGrid'),
    gridViewAnimation: document.getElementById('gridViewAnimation'),
    listViewAnimation: document.getElementById('listViewAnimation'),
    // Added for series section
    seriesGrid: document.getElementById('seriesGrid'),
    gridViewSeries: document.getElementById('gridViewSeries'),
    listViewSeries: document.getElementById('listViewSeries'),
    clearWatchlistBtn: document.getElementById('clearWatchlistBtn')
};

document.addEventListener('DOMContentLoaded', () => {
    loadPopularMovies();
    setupEventListeners();

    // ─── FIX 1: Remember current page on refresh ─────────────────────────
    const savedSection = window.location.hash.substring(1) || 'movies';
    switchSection(savedSection);
});

function setupEventListeners() {
    els.searchBtn.addEventListener('click', handleSearch);
    els.searchInput.addEventListener('keypress', e => e.key === 'Enter' && handleSearch());

    els.genreFilter.addEventListener('change', handleFilterChange);
    els.yearFilter.addEventListener('change', handleFilterChange);
    els.ratingFilter.addEventListener('change', handleFilterChange);

    els.gridView.addEventListener('click', () => setViewMode('grid'));
    els.listView.addEventListener('click', () => setViewMode('list'));

    // Fixed: Trending view toggles
    if (els.gridViewTrending) els.gridViewTrending.addEventListener('click', () => setViewMode('grid'));
    if (els.listViewTrending) els.listViewTrending.addEventListener('click', () => setViewMode('list'));

    // Animation view toggles
    if (els.gridViewAnimation) els.gridViewAnimation.addEventListener('click', () => setViewMode('grid'));
    if (els.listViewAnimation) els.listViewAnimation.addEventListener('click', () => setViewMode('list'));

    // Series view toggles
    if (els.gridViewSeries) els.gridViewSeries.addEventListener('click', () => setViewMode('grid'));
    if (els.listViewSeries) els.listViewSeries.addEventListener('click', () => setViewMode('list'));

    els.loadMoreBtn.addEventListener('click', loadMoreMovies);

    els.modalClose.addEventListener('click', closeModal);
    window.addEventListener('click', e => e.target === els.movieModal && closeModal());

    els.exploreBtn.addEventListener('click', () => document.getElementById('movies').scrollIntoView({ behavior: 'smooth' }));
    els.trendingBtn.addEventListener('click', loadTrendingMovies);

    els.hamburger.addEventListener('click', () => els.navMenu.classList.toggle('active'));

    // Fixed: Clear Watchlist button
    if (els.clearWatchlistBtn) {
        els.clearWatchlistBtn.addEventListener('click', () => {
            if (confirm('Clear entire watchlist?')) {
                localStorage.removeItem('watchlist');
                renderWatchlist();
            }
        });
    }

    // Trailer button handler
    document.addEventListener('click', e => {
        if (e.target.closest('.trailer-btn')) {
            const btn = e.target.closest('.trailer-btn');
            const card = btn.closest('.movie-card');
            
            if (!card) {
                // Fallback to modal trailer button
                if (currentMovie) {
                    const { id, title, release_date } = currentMovie;
                    const year = release_date ? release_date.slice(0, 4) : 'N/A';
                    const mType = currentMovie.media_type || 'movie';
                    
                    getMovieTrailer(id, title, year, mType).then(trailer => {
                        if (trailer) displayTrailer(trailer);
                        else showNotification('No trailer available');
                    }).catch(err => {
                        console.error(err);
                        showNotification('Error loading trailer');
                    });
                }
                return;
            }

            const movieId = parseInt(card.dataset.movieId);
            const movieTitle = card.dataset.movieTitle;
            const mediaType = card.dataset.mediaType || 'movie';
            const year = 'N/A';

            getMovieTrailer(movieId, movieTitle, year, mediaType).then(trailer => {
                if (trailer) displayTrailer(trailer);
                else showNotification('No trailer available');
            }).catch(err => {
                console.error(err);
                showNotification('Error loading trailer');
            });
        }
    });

    // Watchlist button handler
    document.addEventListener('click', e => {
        if (e.target.closest('.watchlist-btn')) {
            e.stopPropagation();
            const card = e.target.closest('.movie-card');
            const movieId = card ? parseInt(card.dataset.movieId) : currentMovie ? currentMovie.id : null;
            if (movieId) toggleWatchlist(movieId);
        }
    });
}

// Watchlist navigation and rendering
function switchSection(sectionId) {
    document.querySelectorAll('section, main').forEach(s => s.style.display = 'none');
    const target = document.getElementById(sectionId);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
    if (activeLink) activeLink.classList.add('active');

    // ─── FIX 2: Show correct content when returning to any page ─────────────────────────
    if (sectionId === 'home' || sectionId === 'movies') {
        document.getElementById('movies').style.display = 'block';
        if (allMovies.length === 0) loadPopularMovies();
        else displayMovies(allMovies);
    }

    // Fixed: Load trending movies when user clicks Trending in nav
    if (sectionId === 'trending') {
        loadTrendingMovies();
    }

    // Load animations when user clicks Animation in nav
    if (sectionId === 'animation') {
        loadAnimations();
    }

    // Load series when user clicks Series in nav
    if (sectionId === 'series') {
        loadSeries();
    }

    if (sectionId === 'watchlist') renderWatchlist();
}

// Attach navigation to all links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');

        // Close the mobile hamburger menu whenever a nav link is tapped,
        // whether it's an in-page section or a real link like requests.html
        els.navMenu.classList.remove('active');

        // Only hijack in-page section links (href="#something").
        // Real page links (e.g. "requests.html") should navigate normally.
        if (!href || !href.startsWith('#')) return;

        e.preventDefault();
        const sectionId = href.substring(1);
        switchSection(sectionId);
    });
});

// ─── FIX 3: Logo now correctly shows movie grid (not blank home) ─────────────────────────
document.querySelector('.nav-logo').addEventListener('click', () => {
    els.navMenu.classList.remove('active');
    switchSection('movies');
});

// Rest of your original functions (100% unchanged from here)
function toggleWatchlist(movieId) {
    let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
    if (watchlist.includes(movieId)) {
        watchlist = watchlist.filter(id => id !== movieId);
        showNotification('Removed from Watchlist');
    } else {
        watchlist.push(movieId);
        showNotification('Added to Watchlist');
    }
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    
    // Update watchlist button text if modal is open
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

    if (ids.length === 0) {
        empty.style.display = 'block';
        grid.innerHTML = '';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = '<div style="text-align:center;padding:3rem;"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const promises = ids.map(id => fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`).then(r => r.json()));
        const movies = await Promise.all(promises);

        grid.innerHTML = movies.map(movie => `
            <div class="movie-card" data-movie-id="${movie.id}" data-movie-title="${movie.title.replace(/'/g, "\\'")}" data-media-type="movie">
                <img src="${IMAGE_BASE_URL}${movie.poster_path}" alt="${movie.title}" class="movie-poster">
                <div class="movie-info">
                    <h3 class="movie-title">${movie.title}</h3>
                    <div class="movie-meta">
                        <span>${movie.release_date ? movie.release_date.slice(0,4) : 'N/A'}</span>
                        <span class="rating">⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                    </div>
                </div>
                <div class="movie-overlay">
                    <button class="btn btn-secondary watchlist-btn">Remove</button>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const movieId = parseInt(card.dataset.movieId);
                showMovieDetails(movieId);
            });
        });

    } catch (e) {
        grid.innerHTML = '<p style="color:#e50914;text-align:center;padding:2rem;">Failed to load watchlist.</p>';
    }
}

// ─── Rest of your original code (100% unchanged) ─────────────────────────
function showLoading() {
    els.loadingSpinner.classList.add('active');
    els.loadMoreBtn.disabled = true;
    els.loadMoreBtn.textContent = 'Loading...';
}

function hideLoading() {
    els.loadingSpinner.classList.remove('active');
    els.loadMoreBtn.disabled = false;
    els.loadMoreBtn.textContent = 'Load More';
}

async function fetchFromAPI(endpoint) {
    try {
        showLoading();
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}`;
        console.log('Fetching:', url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
        const data = await res.json();
        hideLoading();
        return data;
    } catch (err) {
        console.error('Fetch failed:', err.message, err);
        hideLoading();
        return null;
    }
}

async function loadPopularMovies(retry = 0) {
    // Only load content that has been added via the admin panel
    const movieIds = window.downloadLinks ? Object.keys(window.downloadLinks).map(id => parseInt(id)) : [];

    const seriesList = window.seriesData ? Object.values(window.seriesData).map(series => ({
        id: series.id,
        title: series.title,
        poster_path: series.poster_path,
        release_date: "2021-01-01",
        vote_average: 8.5,
        media_type: "tv"
    })) : [];

    const animationList = window.animationData ? Object.values(window.animationData).map(animation => ({
        id: animation.id,
        title: animation.title,
        poster_path: animation.poster_path,
        release_date: "2021-01-01",
        vote_average: 8.5,
        media_type: "tv"
    })) : [];

    // Nothing added anywhere (no movies, no series, no animations)
    if (movieIds.length === 0 && seriesList.length === 0 && animationList.length === 0) {
        els.moviesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #888;">No movies uploaded yet.</p>';
        els.loadMoreBtn.style.display = 'none';
        return;
    }

    // No movies yet, but there are series/animations — show those instead of bailing out
    if (movieIds.length === 0) {
        if (currentPage === 1) {
            allMovies = [...seriesList, ...animationList];
            displayMovies(allMovies);
        }
        return;
    }

    showLoading();

    try {
        const promises = movieIds.map(id => fetchFromAPI(`/movie/${id}`));
        const movies = await Promise.all(promises);
        const validMovies = movies.filter(m => m !== null);

        if (currentPage === 1) {
            allMovies = [...seriesList, ...animationList, ...validMovies];
            displayMovies(allMovies);
        }
        hideLoading();
    } catch (err) {
        console.error('Failed to load uploaded movies:', err);
        hideLoading();
        if (retry < 2) {
            setTimeout(() => loadPopularMovies(retry + 1), 1200);
        } else {
            showFallbackContent();
        }
    }
}

function loadMoreMovies() {
    currentPage++;
    if (currentSearch) {
        searchMovies(currentSearch);
    } else {
        loadPopularMovies();
    }
}

async function loadTrendingMovies() {
    currentPage = 1;
    currentGenre = currentYear = currentRating = currentSearch = '';
    els.genreFilter.value = els.yearFilter.value = els.ratingFilter.value = els.searchInput.value = '';

    // Only load movies that have been uploaded (in downloadLinks)
    if (window.downloadLinks) {
        const movieIds = Object.keys(window.downloadLinks).map(id => parseInt(id));
        
        if (movieIds.length === 0) {
            els.trendingGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #888;">No movies uploaded yet.</p>';
            document.getElementById('trending').style.display = 'block';
            document.getElementById('movies').style.display = 'none';
            return;
        }

        showLoading();
        
        try {
            const promises = movieIds.map(id => fetchFromAPI(`/movie/${id}`));
            const movies = await Promise.all(promises);
            const validMovies = movies.filter(m => m !== null);
            
            allMovies = validMovies;
            
            // Show trending section and display movies in trending grid
            document.getElementById('trending').style.display = 'block';
            document.getElementById('movies').style.display = 'none';
            els.trendingGrid.innerHTML = validMovies.map(createMovieCard).join('');

            // Add click listeners to trending cards
            els.trendingGrid.querySelectorAll('.movie-card').forEach(card => {
                card.addEventListener('click', () => {
                    const movieId = card.dataset.movieId;
                    showMovieDetails(movieId);
                });
            });
            
            hideLoading();
        } catch (err) {
            console.error('Failed to load uploaded movies:', err);
            hideLoading();
            showFallbackContent();
        }
    } else {
        els.trendingGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #888;">No movies uploaded yet.</p>';
        document.getElementById('trending').style.display = 'block';
        document.getElementById('movies').style.display = 'none';
    }
}

async function loadAnimations() {
    if (window.animationData) {
        const animationList = Object.values(window.animationData).map(animation => ({
            id: animation.id,
            title: animation.title,
            poster_path: animation.poster_path,
            release_date: "2021-01-01",
            vote_average: 8.5,
            media_type: "tv"
        }));

        document.getElementById('animation').style.display = 'block';
        document.getElementById('movies').style.display = 'none';
        document.getElementById('trending').style.display = 'none';
        els.animationGrid.innerHTML = animationList.map(createMovieCard).join('');

        // Add click listeners to animation cards
        els.animationGrid.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                showMovieDetails(movieId);
            });
        });
    } else {
        els.animationGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #888;">No animations available</p>';
    }
}

async function loadSeries() {
    if (window.seriesData) {
        const seriesList = Object.values(window.seriesData).map(series => ({
            id: series.id,
            title: series.title,
            poster_path: series.poster_path,
            release_date: "2021-01-01",
            vote_average: 8.5,
            media_type: "tv"
        }));

        document.getElementById('series').style.display = 'block';
        document.getElementById('movies').style.display = 'none';
        document.getElementById('trending').style.display = 'none';
        document.getElementById('animation').style.display = 'none';

        if (seriesList.length === 0) {
            els.seriesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #888;">No series added yet.</p>';
            return;
        }

        els.seriesGrid.innerHTML = seriesList.map(createMovieCard).join('');

        // Add click listeners to series cards
        els.seriesGrid.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movieId;
                showMovieDetails(movieId);
            });
        });
    } else {
        els.seriesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #888;">No series added yet.</p>';
    }
}

function showFallbackContent() {
    const fallback = [
        { id: 27205, title: "Inception", release_date: "2010-07-16", vote_average: 8.4, poster_path: "/9gk7adHYeL0O8xH0v4k6vXjX0.jpg" },
        { id: 155, title: "The Dark Knight", release_date: "2008-07-18", vote_average: 8.5, poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
        { id: 272, title: "Batman Begins", release_date: "2005-06-15", vote_average: 7.7, poster_path: "/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg" }
    ];
    displayMovies(fallback);
    showNotification('Could not load movies. Showing samples.');
}

async function searchMovies(query) {
    // Local search only returns everything in one pass — ignore repeat calls
    // triggered by "Load More" (there's no second page to fetch).
    if (currentPage > 1) return;

    const searchTerm = query.toLowerCase().trim();
    let results = [];

    // Search movies that have been added via the admin panel (in downloadLinks)
    if (window.downloadLinks) {
        const movieIds = Object.keys(window.downloadLinks).map(id => parseInt(id));
        if (movieIds.length > 0) {
            showLoading();
            const promises = movieIds.map(id => fetchFromAPI(`/movie/${id}`));
            const movies = await Promise.all(promises);
            hideLoading();
            const matchingMovies = movies.filter(m => m && m.title && m.title.toLowerCase().includes(searchTerm));
            results.push(...matchingMovies);
        }
    }

    // Search series that have been added via the admin panel
    if (window.seriesData) {
        const matchingSeries = Object.values(window.seriesData)
            .filter(series => series.title && series.title.toLowerCase().includes(searchTerm))
            .map(series => ({
                id: series.id,
                title: series.title,
                poster_path: series.poster_path,
                release_date: "2021-01-01",
                vote_average: 8.5,
                media_type: "tv"
            }));
        results.push(...matchingSeries);
    }

    // Search animations that have been added via the admin panel
    if (window.animationData) {
        const matchingAnimations = Object.values(window.animationData)
            .filter(animation => animation.title && animation.title.toLowerCase().includes(searchTerm))
            .map(animation => ({
                id: animation.id,
                title: animation.title,
                poster_path: animation.poster_path,
                release_date: "2021-01-01",
                vote_average: 8.5,
                media_type: "tv"
            }));
        results.push(...matchingAnimations);
    }

    allMovies = results;
    displayMovies(allMovies);
    els.loadMoreBtn.style.display = 'none';
}

function handleSearch() {
    const q = els.searchInput.value.trim();
    if (!q) {
        currentSearch = '';
        currentPage = 1;
        loadPopularMovies();
        return;
    }
    currentSearch = q;
    currentPage = 1;
    searchMovies(q);
}

function handleFilterChange() {
    currentGenre = els.genreFilter.value;
    currentYear = els.yearFilter.value;
    currentRating = els.ratingFilter.value;
    currentPage = 1;
    applyFilters();
}

function applyFilters() {
    let filtered = [...allMovies];
    if (currentGenre) filtered = filtered.filter(m => m.genre_ids?.includes(Number(currentGenre)));
    if (currentYear) filtered = filtered.filter(m => m.release_date?.startsWith(currentYear));
    if (currentRating) filtered = filtered.filter(m => m.vote_average >= Number(currentRating));
    displayMovies(filtered);
}

function setViewMode(mode) {
    isGridView = mode === 'grid';
    els.gridView.classList.toggle('active', isGridView);
    els.listView.classList.toggle('active', !isGridView);
    if (els.gridViewTrending) els.gridViewTrending.classList.toggle('active', isGridView);
    if (els.listViewTrending) els.listViewTrending.classList.toggle('active', !isGridView);
    if (els.gridViewAnimation) els.gridViewAnimation.classList.toggle('active', isGridView);
    if (els.listViewAnimation) els.listViewAnimation.classList.toggle('active', !isGridView);
    if (els.gridViewSeries) els.gridViewSeries.classList.toggle('active', isGridView);
    if (els.listViewSeries) els.listViewSeries.classList.toggle('active', !isGridView);

    els.moviesGrid.className = isGridView ? 'movies-grid' : 'movies-list';
    if (els.trendingGrid) els.trendingGrid.className = isGridView ? 'movies-grid' : 'movies-list';
    if (els.animationGrid) els.animationGrid.className = isGridView ? 'movies-grid' : 'movies-list';
    if (els.seriesGrid) els.seriesGrid.className = isGridView ? 'movies-grid' : 'movies-list';

    if (allMovies.length) displayMovies(allMovies);
}

function closeModal() {
    els.movieModal.style.display = 'none';
    currentMovie = null;
}

// UPDATED: Now supports series and animations from movies-data.js
async function showMovieDetails(movieId) {
    if (window.seriesData && window.seriesData[movieId]) {
        displaySeriesModal(window.seriesData[movieId], 'series');
        return;
    }
    if (window.animationData && window.animationData[movieId]) {
        displaySeriesModal(window.animationData[movieId], 'animation');
        return;
    }
    
    const data = await fetchFromAPI(`/movie/${movieId}?append_to_response=credits`);
    if (data) displayMovieModal(data);
}

// ─── Series/Animation Download Progress Tracking ─────────────────────────
// Tracks which episodes a user has downloaded (per browser, via localStorage)
// so they can see where they left off next time they visit.

function getSeriesKey(series, sourceType) {
    return `${sourceType}_${series.id}`;
}

function getDownloadProgress() {
    return JSON.parse(localStorage.getItem('seriesProgress')) || {};
}

function saveDownloadProgress(progress) {
    localStorage.setItem('seriesProgress', JSON.stringify(progress));
}

function markEpisodeDownloaded(seriesKey, seasonNum, epNum) {
    const progress = getDownloadProgress();
    if (!progress[seriesKey]) progress[seriesKey] = {};
    if (!progress[seriesKey][seasonNum]) progress[seriesKey][seasonNum] = [];
    const epNumStr = String(epNum);
    if (!progress[seriesKey][seasonNum].includes(epNumStr)) {
        progress[seriesKey][seasonNum].push(epNumStr);
    }
    saveDownloadProgress(progress);
}

function isEpisodeDownloaded(seriesKey, seasonNum, epNum) {
    const progress = getDownloadProgress();
    return !!(progress[seriesKey] && progress[seriesKey][seasonNum] && progress[seriesKey][seasonNum].includes(String(epNum)));
}

// Summarizes progress for a series: total episodes, how many downloaded, and the last one downloaded
function getSeriesProgressSummary(series, seriesKey) {
    const progress = getDownloadProgress();
    const seriesProgress = progress[seriesKey] || {};
    let totalEpisodes = 0;
    let downloadedCount = 0;
    let lastDownloaded = null;

    const seasonNumbers = Object.keys(series.seasons || {}).sort((a, b) => a - b);
    seasonNumbers.forEach(seasonNum => {
        const episodes = series.seasons[seasonNum];
        const epNums = Object.keys(episodes).sort((a, b) => a - b);
        totalEpisodes += epNums.length;
        epNums.forEach(epNum => {
            if (seriesProgress[seasonNum] && seriesProgress[seasonNum].includes(String(epNum))) {
                downloadedCount++;
                lastDownloaded = { season: seasonNum, episode: epNum };
            }
        });
    });

    return { totalEpisodes, downloadedCount, lastDownloaded };
}

function renderSeriesProgressBanner(series, seriesKey) {
    const banner = document.getElementById('seriesProgressBanner');
    if (!banner) return;

    const { totalEpisodes, downloadedCount, lastDownloaded } = getSeriesProgressSummary(series, seriesKey);

    if (downloadedCount === 0) {
        banner.innerHTML = '';
        return;
    }

    const isComplete = downloadedCount >= totalEpisodes;

    banner.innerHTML = `
        <div class="series-progress-banner">
            <i class="fas ${isComplete ? 'fa-trophy' : 'fa-check-circle'}"></i>
            <span>${isComplete
                ? `All ${totalEpisodes} episodes downloaded`
                : `${downloadedCount}/${totalEpisodes} episodes downloaded — you're up to Season ${lastDownloaded.season}, Episode ${lastDownloaded.episode}`}</span>
        </div>
    `;
}

// NEW: Display series episodes with dropdown season selector
function displaySeriesModal(series, sourceType = 'series') {
    currentMovie = series;
    const seriesKey = getSeriesKey(series, sourceType);

    document.getElementById('modalPoster').src = series.poster_path 
        ? IMAGE_BASE_URL + series.poster_path 
        : 'https://via.placeholder.com/300x450?text=No+Poster';

    document.getElementById('modalTitle').textContent = series.title || 'Series';
    document.getElementById('modalYear').textContent = 'Series';
    document.getElementById('modalRuntime').textContent = 'Multiple Episodes';
    document.getElementById('modalRating').textContent = '⭐ N/A';
    document.getElementById('modalOverview').textContent = 'Select a season to view episodes';

    let seasonsHTML = '<div id="seriesProgressBanner"></div>';
    seasonsHTML += '<h3 style="margin:15px 0 10px;color:#e50914;">Seasons</h3>';
    let seasonToOpen = '';

    if (series.seasons) {
        const seasonNumbers = Object.keys(series.seasons).sort((a, b) => a - b);

        // Create dropdown selector
        const seasonOptions = seasonNumbers.map(seasonNum =>
            `<option value="${seasonNum}">Season ${seasonNum}</option>`
        ).join('');

        seasonsHTML += `
            <div class="season-selector-container">
                <select id="seasonSelect" class="season-dropdown-select">
                    <option value="">Select a season...</option>
                    ${seasonOptions}
                </select>
            </div>
            <div id="episodesContainer" class="episodes-container"></div>
        `;

        // Auto-open the season the user last downloaded an episode from, so
        // they can immediately see where they got to.
        const progressSummary = getSeriesProgressSummary(series, seriesKey);
        seasonToOpen = progressSummary.lastDownloaded ? progressSummary.lastDownloaded.season : '';
    }

    document.getElementById('modalCast').innerHTML = seasonsHTML;
    renderSeriesProgressBanner(series, seriesKey);

    // Add event listener for season selection
    const seasonSelect = document.getElementById('seasonSelect');
    if (seasonSelect) {
        seasonSelect.addEventListener('change', function() {
            displaySeasonEpisodes(series, seriesKey, this.value);
        });

        if (seasonToOpen) {
            seasonSelect.value = seasonToOpen;
            displaySeasonEpisodes(series, seriesKey, seasonToOpen);
        }
    }

    // Hide the general download button for series since episodes have individual download buttons
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.style.display = 'none';
    }

    // Update watchlist button state
    const watchlistBtn = document.querySelector('.watchlist-btn');
    if (watchlistBtn) {
        const watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
        const isInWatchlist = watchlist.includes(series.id);
        watchlistBtn.innerHTML = isInWatchlist ? '<i class="fas fa-minus"></i> Remove from Watchlist' : '<i class="fas fa-plus"></i> Add to Watchlist';
    }

    els.movieModal.style.display = 'flex';
}

// Display episodes for selected season, with download-progress indicators
// Turns a stored bridge stream URL (https://.../download/{channelId}/{messageId})
// into the params download.html expects, so episode downloads go through the
// same verified, multi-method download manager as movie downloads do.
function buildEpisodeDownloadPageUrl(rawUrl, episodeName) {
    const match = rawUrl.match(/\/download\/([^\/]+)\/(\d+)\/?(?:\?.*)?$/);
    if (match) {
        const [, channelId, messageId] = match;
        const params = new URLSearchParams();
        params.set('msg', messageId);
        if (channelId && channelId !== 'home') params.set('ch', channelId);
        params.set('name', episodeName);
        return `download.html?${params.toString()}`;
    }
    // Fallback: not in the expected bridge format — pass it through as a direct link
    const params = new URLSearchParams();
    params.set('link', rawUrl);
    params.set('name', episodeName);
    return `download.html?${params.toString()}`;
}

function displaySeasonEpisodes(series, seriesKey, seasonNum) {
    const episodesContainer = document.getElementById('episodesContainer');

    if (!seasonNum) {
        episodesContainer.innerHTML = '';
        return;
    }

    if (!series || !series.seasons[seasonNum]) {
        episodesContainer.innerHTML = '<p style="color:#888;padding:1rem;">No episodes found for this season.</p>';
        return;
    }

    const episodes = series.seasons[seasonNum];
    const sortedEpNums = Object.keys(episodes).sort((a, b) => a - b);

    // First episode in this season that hasn't been downloaded yet — flagged as "continue here"
    const nextEpisode = sortedEpNums.find(epNum => !isEpisodeDownloaded(seriesKey, seasonNum, epNum));

    const episodesList = sortedEpNums.map(epNum => {
        const downloaded = isEpisodeDownloaded(seriesKey, seasonNum, epNum);
        const isNext = epNum === nextEpisode;
        const episodeName = `${series.title} - Season ${seasonNum} Episode ${epNum}`;
        const downloadPageUrl = buildEpisodeDownloadPageUrl(episodes[epNum], episodeName);
        return `
        <div class="episode-item${downloaded ? ' episode-downloaded' : ''}">
            <span class="episode-number">
                Episode ${epNum}${downloaded ? ' <i class="fas fa-check-circle episode-check" title="Downloaded"></i>' : ''}${!downloaded && isNext ? ' <span class="continue-badge">CONTINUE HERE</span>' : ''}
            </span>
            <button class="episode-download-btn${downloaded ? ' downloaded' : ''}" data-download-url="${downloadPageUrl.replace(/"/g, '&quot;')}" data-season="${seasonNum}" data-episode="${epNum}">
                <i class="fas fa-download"></i> ${downloaded ? 'Downloaded' : 'Download'}
            </button>
        </div>
    `;
    }).join('');

    episodesContainer.innerHTML = `
        <div class="season-episodes-display">
            <h4 style="margin:1rem 0 0.5rem;color:#e50914;">Season ${seasonNum} Episodes</h4>
            ${episodesList}
        </div>
    `;

    // Add event listeners for download buttons
    episodesContainer.querySelectorAll('.episode-download-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const url = this.dataset.downloadUrl;
            const sNum = this.dataset.season;
            const eNum = this.dataset.episode;
            if (url) {
                // Opens the download manager page (verification + reliable multi-method download)
                window.open(url, '_blank');
                markEpisodeDownloaded(seriesKey, sNum, eNum);
                // Refresh the episode list and progress banner to reflect the new state
                displaySeasonEpisodes(series, seriesKey, seasonNum);
                renderSeriesProgressBanner(series, seriesKey);
            }
        });
    });
}

function displayMovieModal(movie) {
    currentMovie = movie;

    document.getElementById('modalPoster').src = movie.poster_path 
        ? IMAGE_BASE_URL + movie.poster_path 
        : 'https://via.placeholder.com/300x450?text=No+Poster';

    document.getElementById('modalTitle').textContent = movie.title;
    document.getElementById('modalYear').textContent = movie.release_date?.slice(0,4) || 'N/A';
    
    document.getElementById('modalRuntime').textContent = movie.runtime 
        ? `${Math.floor(movie.runtime / 60)}hr ${movie.runtime % 60}mins` 
        : 'N/A';

    document.getElementById('modalRating').textContent = movie.vote_average ? `⭐ ${movie.vote_average.toFixed(1)}` : 'N/A';
    document.getElementById('modalOverview').textContent = movie.overview || 'No overview available.';

    document.getElementById('modalGenres').innerHTML = movie.genres?.map(g => 
        `<span class="genre-tag">${g.name}</span>`
    ).join('') || '';

    const cast = movie.credits?.cast?.slice(0,6) || [];
    document.getElementById('modalCast').innerHTML = cast.map(c => `
        <div class="cast-member">
            <img src="${c.profile_path ? IMAGE_BASE_URL + c.profile_path : 'https://via.placeholder.com/60'}" alt="${c.name}">
            <p>${c.name}</p>
        </div>
    `).join('') || '<p>No cast info available.</p>';

    els.movieModal.style.display = 'flex';

    // Show the download button for movies and route through Download Manager
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.style.display = 'inline-flex';
        downloadBtn.onclick = () => {
            const movieId = movie.id;
            if (window.downloadLinks && window.downloadLinks[movieId]) {
                // Safely opens the standalone download manager in a fresh tab
                window.open(`download.html?id=${movieId}`, '_blank');
            } else {
                showNotification('Download link hasn\'t been mapped yet.');
            }
        };
    }

    // Update watchlist button state
    const watchlistBtn = document.querySelector('.watchlist-btn');
    if (watchlistBtn) {
        const watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
        const isInWatchlist = watchlist.includes(movie.id);
        watchlistBtn.innerHTML = isInWatchlist ? '<i class="fas fa-minus"></i> Remove from Watchlist' : '<i class="fas fa-plus"></i> Add to Watchlist';
    }
}

function displayMovies(movies) {
    if (!movies?.length) {
        els.moviesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #888;">No movies found</p>';
        els.loadMoreBtn.style.display = 'none';
        return;
    }

    els.moviesGrid.innerHTML = movies.map(createMovieCard).join('');
    els.loadMoreBtn.style.display = 'block';

    els.moviesGrid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => {
            const movieId = card.dataset.movieId;
            showMovieDetails(movieId);
        });
    });
}

function appendMovies(movies) {
    if (!movies?.length) return;
    els.moviesGrid.insertAdjacentHTML('beforeend', movies.map(createMovieCard).join(''));

    els.moviesGrid.querySelectorAll('.movie-card:not([data-listener-added])').forEach(card => {
        card.dataset.listenerAdded = 'true';
        card.addEventListener('click', () => {
            const movieId = card.dataset.movieId;
            showMovieDetails(movieId);
        });
    });
}

function createMovieCard(movie) {
    const poster = movie.poster_path 
        ? IMAGE_BASE_URL + movie.poster_path 
        : 'https://via.placeholder.com/200x300?text=No+Poster';

    const year = movie.release_date ? movie.release_date.slice(0, 4) : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const mediaType = movie.media_type || 'movie';

    return `
        <div class="movie-card" data-movie-id="${movie.id}" data-movie-title="${movie.title.replace(/'/g, "\\'")}" data-media-type="${mediaType}">
            <img src="${poster}" alt="${movie.title}" class="movie-poster" loading="lazy">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <span>${year}</span>
                    <span class="rating">⭐ ${rating}</span>
                </div>
            </div>
            <div class="movie-overlay">
                <button class="btn btn-secondary watchlist-btn">Add to Watchlist</button>
            </div>
        </div>
    `;
}

function showNotification(message) {
    const n = document.createElement('div');
    n.className = 'notification';
    n.textContent = message;
    n.style.cssText = `
        position:fixed;top:20px;right:20px;background:#e50914;color:white;
        padding:1rem 1.5rem;border-radius:8px;z-index:3000;
        animation:slideIn 0.3s ease;
    `;
    document.body.appendChild(n);
    setTimeout(() => {
        n.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => document.body.removeChild(n), 300);
    }, 3000);
}

if (!document.getElementById('notification-styles')) {
    const s = document.createElement('style');
    s.id = 'notification-styles';
    s.textContent = `
        @keyframes slideIn { from {transform:translateX(100%);opacity:0} to {transform:translateX(0);opacity:1} }
        @keyframes slideOut { from {transform:translateX(0);opacity:1} to {transform:translateX(100%);opacity:0} }
    `;
    document.head.appendChild(s);
}

// ─── Trailer Functions ─────────────────────────

async function getMovieTrailer(movieId, title, year, mediaType) {
    // Determine media type: check if it's a known series/animation
    const isTv = mediaType === 'tv' ||
        (window.seriesData && window.seriesData[movieId]) ||
        (window.animationData && window.animationData[movieId]);

    const endpoint = isTv ? 'tv' : 'movie';

    try {
        // Try primary endpoint first
        const videosRes = await fetch(`${BASE_URL}/${endpoint}/${movieId}/videos?api_key=${API_KEY}&language=en-US`);
        if (videosRes.ok) {
            const { results } = await videosRes.json();
            console.log(`Found ${results.length} videos for ${title} (${movieId})`);

            let t = results.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official);
            if (t) {
                console.log(`Using official trailer: ${t.key}`);
                return { source: 'youtube', key: t.key, name: t.name || 'Official Trailer' };
            }
            t = results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            if (t) {
                console.log(`Using trailer: ${t.key}`);
                return { source: 'youtube', key: t.key, name: t.name || 'Trailer' };
            }
            // If no trailer but results exist, try any YouTube video
            t = results.find(v => v.site === 'YouTube');
            if (t) {
                console.log(`Using any YouTube video: ${t.key}`);
                return { source: 'youtube', key: t.key, name: t.name || 'Video' };
            }
        }

        // If TV failed or returned nothing, try movie endpoint as fallback (and vice versa)
        const fallbackEndpoint = isTv ? 'movie' : 'tv';
        const fallbackRes = await fetch(`${BASE_URL}/${fallbackEndpoint}/${movieId}/videos?api_key=${API_KEY}&language=en-US`);
        if (fallbackRes.ok) {
            const { results } = await fallbackRes.json();
            let t = results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            if (t) {
                console.log(`Using fallback trailer: ${t.key}`);
                return { source: 'youtube', key: t.key, name: t.name || 'Trailer' };
            }
        }

        console.log(`No trailer found for ${title} (${movieId})`);
        return null;
    } catch (err) {
        console.warn('Trailer fetch failed:', err);
        return null;
    }
}

function displayTrailer(trailer) {
    if (!trailer || trailer.source !== 'youtube') {
        showNotification('No trailer available');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'trailer-modal';
    modal.innerHTML = `
        <div class="trailer-modal-content">
            <span class="trailer-close">×</span>
            <div class="trailer-container">
                <iframe
                    id="trailerIframe"
                    src=""
                    title="${trailer.name}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
            </div>
            <div class="trailer-info">
                <h3>${trailer.name || 'Trailer'}</h3>
                <button class="btn btn-primary" id="watchOnYoutubeBtn">
                    Watch on YouTube
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Set iframe source with simpler, more reliable parameters
    const iframe = modal.querySelector('#trailerIframe');
    iframe.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`;

    // Add event listener for YouTube button
    modal.querySelector('#watchOnYoutubeBtn').addEventListener('click', () => {
        window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
    });

    // Handle iframe load errors
    iframe.onerror = () => {
        console.error('Trailer iframe failed to load');
        showNotification('Trailer unavailable. Watch on YouTube instead.');
    };

    const close = () => {
        // Stop video by clearing src before removing
        iframe.src = '';
        document.body.removeChild(modal);
        document.body.style.overflow = '';
    };

    modal.querySelector('.trailer-close').onclick = close;
    modal.onclick = e => e.target === modal && close();
}

async function handleTrailer(movieId, title, mediaType) {
    const year = 'N/A';
    const trailer = await getMovieTrailer(movieId, title, year, mediaType);
    if (trailer) displayTrailer(trailer);
    else showNotification('No trailer available for this title.');
}
