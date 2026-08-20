import { BrowserRouter as Router, Routes, Route, 
    // Redirect
} from "react-router-dom";
import MovieDetails from './components/MovieDetails/MovieDetails';
import MovieSearch from './pages/MovieSearch/MovieSearch';
import { CinemaLobby } from "./pages/MovieSearch/CinemaLobby/CinemaLobby";
import Layout from './components/Layout/Layout';

export const Routing = () => {
    return (
        <Router>
            <Layout>
                <Routes>
                    <Route path="/" element={<CinemaLobby />} />
                    <Route path="/old" element={<MovieSearch />} />
                    <Route path="/movie/:id" element={<MovieDetails />} />
                </Routes>
            </Layout>
        </Router>
    );
}