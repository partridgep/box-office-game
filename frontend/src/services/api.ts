export const searchMovies = async (search: string) => {
    const response = await fetch(`/api/search-movies?search=${search}`);
    if (!response.ok) throw new Error('Failed to fetch movies');
    return response.json();
};

export const getMovieDetails = async (imdbID: string) => {
    const response = await fetch(`/api/movie?id=${imdbID}`);
    if (!response.ok) throw new Error('Failed to fetch movie');
    return response.json();
};

export const fetchBoxOfficeData = async (imdbID: string) => {
    const response = await fetch(`/api/box-office?id=${imdbID}`);
    if (!response.ok) throw new Error('Failed to fetch box office data');
    return response.json();
};
