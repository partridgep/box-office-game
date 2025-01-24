// import { useState } from 'react'
import './App.css'
import { Routing } from "./Routing"
// import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
// import { searchMovies } from './services/api';
// import MovieResult from './components/MovieResult/MovieResult';
// import MovieDetails from './components/MovieDetails/MovieDetails';
// import MovieSearch from './pages/MovieSearch/MovieSearch';

// Define the type for movie objects
// type Movie = {
//   Title: string;
//   Year: string;
//   Poster: string;
//   imdbID: string;
// }

function App() {
  // const [search, setSearch] = useState<string>('');
  // const [movieResults, setMovieResults] = useState<Movie[]>([]);

  // const handleSearch = async () => {
  //     try {
  //         const result = await searchMovies(search);
  //         setMovieResults(result);
  //     } catch (error) {
  //         console.error(error);
  //     }
  // };

  // const navigate = useNavigate();

  // const onMovieSelect = (imdbID: string) => {
  //   console.log('Selected Movie ID:', imdbID);
  //   navigate(`/movie/${imdbID}`);
  // };

  return (
    <Routing />
    // <div>
    //     <Routes>
    //       <Route path="/" element={<MovieSearch/>}/>
    //       <Route path="/movie/:id" element={<MovieDetails />} />
    //       {/* <Route path="*" element={<NotFound/>}/> */}
    //     </Routes>
    //   </div>
    // <Router>
    //   <Routes>
    //     {/* Home Route */}
    //     <Route
    //       path="/"
    //       element={
    //         <div>
    //             <input
    //                 type="text"
    //                 placeholder="Title"
    //                 value={search}
    //                 onChange={(e) => setSearch(e.target.value)}
    //             />
    //             <button onClick={handleSearch}>
    //               Search Movies
    //               </button>
    //             {movieResults &&
    //               movieResults.map(movie => (
    //                 <MovieResult
    //                   key={movie.imdbID}
    //                   title={movie.Title}
    //                   year={movie.Year}
    //                   poster={movie.Poster}
    //                   id={movie.imdbID}
    //                   onSelect={() => onMovieSelect(movie.imdbID)}
    //                 />
    //               ))
    //             }
    //         </div>
    //       }
    //       />
    //       {/* Movie Details Route */}
    //       <Route path="/movie/:id" element={<MovieDetails />} />
    //     </Routes>
    // </Router>
  )
}

export default App
