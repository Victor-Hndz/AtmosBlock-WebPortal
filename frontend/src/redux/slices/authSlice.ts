import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { User } from "@/types/User";
import { updateUserProfile } from "./userSlice";
import { API_URL_AUTH_LOGIN, API_URL_AUTH_REGISTER } from "@/consts/apiConsts";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Helper function to load initial state from localStorage
const loadAuthState = (): AuthState => {
  try {
    const serializedAuth = localStorage.getItem("auth");
    if (serializedAuth === null) {
      return {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    }
    const authData = JSON.parse(serializedAuth);
    return {
      ...authData,
      isLoading: false,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: error instanceof Error ? error.message : null,
    };
  }
};

const initialState: AuthState = loadAuthState();

export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(API_URL_AUTH_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || "Login failed");
      }

      const data = await response.json();

      // Save token to localStorage for persistent sessions
      if (data.accessToken) {
        localStorage.setItem("token", data.accessToken);
      }

      return data.user;
    } catch (error) {
      console.error("Login error:", error);
      return rejectWithValue("Login failed. Please try again.");
    }
  }
);

export const registerUser = createAsyncThunk(
  "auth/register",
  async ({ name, email, password }: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(API_URL_AUTH_REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || "Registration failed");
      }

      const data = await response.json();

      // Save token to localStorage for persistent sessions
      if (data.accessToken) {
        localStorage.setItem("token", data.accessToken);
      }

      return data.user;
    } catch (error) {
      console.error("Registration error:", error);
      return rejectWithValue("Registration failed. Please try again.");
    }
  }
);

export const logoutUser = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
  try {
    // Clear token from localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("auth");

    return true;
  } catch (error) {
    console.error("Logout error:", error);
    return rejectWithValue("Logout failed. Please try again.");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    syncUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: builder => {
    // Login handling
    builder
      .addCase(loginUser.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;

        // Save auth state to localStorage
        localStorage.setItem(
          "auth",
          JSON.stringify({
            user: action.payload,
            isAuthenticated: true,
          })
        );
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Registration handling
    builder
      .addCase(registerUser.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;

        // Save auth state to localStorage
        localStorage.setItem(
          "auth",
          JSON.stringify({
            user: action.payload,
            isAuthenticated: true,
          })
        );
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout handling
    builder
      .addCase(logoutUser.pending, state => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, state => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Handle profile updates from userSlice
    builder.addCase(updateUserProfile.fulfilled, (state, action) => {
      if (state.user && action.meta.arg) {
        state.user = { ...state.user, ...action.meta.arg };

        // Update the localStorage
        localStorage.setItem(
          "auth",
          JSON.stringify({
            user: state.user,
            isAuthenticated: true,
          })
        );
      }
    });
  },
});

export const { clearError, syncUserProfile } = authSlice.actions;
export default authSlice.reducer;
