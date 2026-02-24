import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile } from "../utils/api";      

<Route
  path="/settings"
  element={<ProtectedRoute><Settings /></ProtectedRoute>}
/>