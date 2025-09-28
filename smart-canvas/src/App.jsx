import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
// Feature imports
import CanvasHost from "./features/webcam-drawing/CanvasHost";
import AiDrawing from "./features/ai-drawing/AiDrawing";
import Flipbook from "./features/flipbook/Flipbook";
// Auth protection
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Protected routes */}
            <Route
                path="/dashboard"
                element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
            />
            <Route
                path="/profile"
                element={<ProtectedRoute><Profile /></ProtectedRoute>}
            />
            <Route
                path="/webcam-drawing"
                element={<ProtectedRoute><CanvasHost /></ProtectedRoute>}
            />
            <Route
                path="/ai-drawing"
                element={<ProtectedRoute><AiDrawing /></ProtectedRoute>}
            />
            <Route
                path="/flipbook"
                element={<ProtectedRoute><Flipbook /></ProtectedRoute>}
            />
        </Routes>
    );
}