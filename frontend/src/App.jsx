import {BrowserRouter, Routes, Route } from "react-router-dom";

import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import WorkoutsPage from "./pages/WorkoutsPage";
import ProtectedRoute from "./components/ProtectedRoute";


function App() {

  return (
    <BrowserRouter>
    
      <Routes>
          <Route path="/login" element = {<LoginPage />}/>
          <Route path ="/signup" element = {<SignupPage />}/>

          <Route element ={<ProtectedRoute />}>
              <Route path="/" element = {<DashboardPage />}/>
              <Route path="/workouts" element = {<WorkoutsPage />}/>
              <Route path="/leaderboard" element = {<LeaderboardPage />}/>
          </Route>
      </Routes>
    
    
    </BrowserRouter>
  );
}

export default App
