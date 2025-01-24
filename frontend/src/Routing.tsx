import { BrowserRouter as Router, Routes, Route, 
    // Redirect
} from "react-router-dom";
import MovieDetails from './components/MovieDetails/MovieDetails';
import MovieSearch from './pages/MovieSearch/MovieSearch';

export const Routing = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<MovieSearch />} />
                <Route path="/movie/:id" element={<MovieDetails />} />
            </Routes>
        </Router>
    );
}