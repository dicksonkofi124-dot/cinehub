// script.js – Final consolidated version (all trailer logic merged)

const API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c';
const BASE_URL = 'https://api.themoviedb.org/3';
const YOUTUBE_API_KEY = 'AIzaSyDu1y5xIX9-DblXaN7Ek7Y1Xg996ez0zwQ';
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';
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
    navMenu: document.querySelector('.nav-menu')
};

document.addEventListener('DOMContentLoaded', () => {
    loadPopularMovies();
    setupEventListeners();
});

function setupEventListeners() {
    els.searchBtn.addEventListener('click', handleSearch);
    els.searchInput.addEventListener('keypress', e => e.key === 'Enter' && handleSearch());

    els.genreFilter.addEventListener('change', handleFilterChange);
    els.yearFilter.addEventListener('change', handleFilterChange);
    els.ratingFilter.addEventListener('change', handleFilterChange);

    els.gridView.addEventListener('click', () => setViewMode('grid'));
    els.listView.addEventListener('click', () => setViewMode('list'));

    els.loadMoreBtn.addEventListener('click', loadMoreMovies);

    els.modalClose.addEventListener('click', closeModal);
    window.addEventListener('click', e => e.target === els.movieModal && closeModal());

    els.exploreBtn.addEventListener('click', () => document.getElementById('movies').scrollIntoView({ behavior: 'smooth' }));
    els.trendingBtn.addEventListener('click', loadTrendingMovies);

    els.hamburger.addEventListener('click', () => els.navMenu.classList.toggle('active'));

    // Trailer button handler
    document.addEventListener('click', e => {
        if (e.target.closest('.trailer-btn')) {
            if (!currentMovie) {
                alert('No movie selected');
                return;
            }
            const { id, title, release_date } = currentMovie;
            const year = release_date ? release_date.slice(0, 4) : 'N/A';

            getMovieTrailer(id, title, year).then(trailer => {
                if (trailer) displayTrailer(trailer);
                else alert('No trailer available');
            }).catch(err => {
                console.error(err);
                alert('Error loading trailer');
            });
        }
    });
}

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
        const res = await fetch(`${BASE_URL}${endpoint}&api_key=${API_KEY}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        hideLoading();
        return data;
    } catch (err) {
        hideLoading();
        return null;
    }
}

async function loadPopularMovies(retry = 0) {
    const data = await fetchFromAPI(`/movie/popular?language=en-US&page=${currentPage}`);
    if (data?.results?.length) {
        if (currentPage === 1) {
            allMovies = data.results;
            displayMovies(allMovies);
        } else {
            allMovies.push(...data.results);
            appendMovies(data.results);
        }
    } else if (retry < 2) {
        setTimeout(() => loadPopularMovies(retry + 1), 1200);
    } else {
        showFallbackContent();
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

    const data = await fetchFromAPI(`/trending/movie/week?language=en-US`);
    if (data?.results?.length) {
        allMovies = data.results;
        displayMovies(allMovies);
        document.getElementById('movies').scrollIntoView({ behavior: 'smooth' });
    } else {
        showFallbackContent();
    }
}

function showFallbackContent() {
    const fallback = [
        { id: 27205, title: "Inception", release_date: "2010-07-16", vote_average: 8.4, poster_path: "/9gk7adHYeL0O8xH0v4k6vXjX0.jpg" },
        { id: 155, title: "The Dark Knight", release_date: "2008-07-18", vote_average: 8.5, poster_path: "/qJ2J5T5qXz0Xz0Xz0Xz0Xz0.jpg" },
        { id: 272, title: "Batman Begins", release_date: "2005-06-15", vote_average: 7.7, poster_path: "/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg" }
    ];
    displayMovies(fallback);
    showNotification('Could not load movies. Showing samples.');
}

async function searchMovies(query) {
    const data = await fetchFromAPI(`/search/movie?query=${encodeURIComponent(query)}&page=${currentPage}`);
    if (data?.results) {
        if (currentPage === 1) {
            allMovies = data.results;
            displayMovies(allMovies);
        } else {
            allMovies.push(...data.results);
            appendMovies(data.results);
        }
    }
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
    els.moviesGrid.className = isGridView ? 'movies-grid' : 'movies-list';
    if (allMovies.length) displayMovies(allMovies);
}

function closeModal() {
    els.movieModal.style.display = 'none';
    currentMovie = null;
}

async function showMovieDetails(movieId) {
    const data = await fetchFromAPI(`/movie/${movieId}?append_to_response=credits`);
    if (data) displayMovieModal(data);
}

function displayMovieModal(movie) {
    currentMovie = movie;

    document.getElementById('modalPoster').src = movie.poster_path 
        ? IMAGE_BASE_URL + movie.poster_path 
        : 'https://via.placeholder.com/300x450?text=No+Poster';

    document.getElementById('modalTitle').textContent = movie.title;
    document.getElementById('modalYear').textContent = movie.release_date?.slice(0,4) || 'N/A';
    document.getElementById('modalRuntime').textContent = movie.runtime ? movie.runtime + ' min' : 'N/A';
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

    return `
        <div class="movie-card" data-movie-id="${movie.id}">
            <img src="${poster}" alt="${movie.title}" class="movie-poster" loading="lazy">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <span>${year}</span>
                    <span class="rating">⭐ ${rating}</span>
                </div>
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

// ─── Trailer Functions (NaijaPrey-style direct embed) ─────────────────────────

async function getMovieTrailer(movieId, title, year) {
    try {
        const videosRes = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}&language=en-US`);
        if (videosRes.ok) {
            const { results } = await videosRes.json();
            let t = results.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official);
            if (t) return { source: 'youtube', key: t.key, name: t.name || 'Official Trailer' };
            t = results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            if (t) return { source: 'youtube', key: t.key, name: t.name || 'Trailer' };
        }
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
                    src="https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&controls=1&rel=0&modestbranding=1&playsinline=1" 
                    title="${trailer.name}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowfullscreen>
                </iframe>
            </div>
            <div class="trailer-info">
                <h3>${trailer.name || 'Trailer'}</h3>
                <button class="btn btn-primary" onclick="window.open('https://www.youtube.com/watch?v=${trailer.key}', '_blank')">
                    Watch on YouTube
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const close = () => {
        document.body.removeChild(modal);
        document.body.style.overflow = '';
    };

    modal.querySelector('.trailer-close').onclick = close;
    modal.onclick = e => e.target === modal && close();
}