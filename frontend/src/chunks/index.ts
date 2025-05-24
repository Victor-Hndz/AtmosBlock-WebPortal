// This file exports optimized chunks for better code splitting
// Add imports for frequently used libraries here

// React ecosystem
export { lazy, Suspense, useState, useEffect, useCallback, useMemo } from "react";
export { createContext, useContext, Fragment } from "react";

// React Router
export { useNavigate, useParams, useLocation, Link, NavLink, Navigate, Outlet } from "react-router-dom";

// Redux toolkit
export type { createSlice, createAsyncThunk, configureStore, PayloadAction } from "@reduxjs/toolkit";
