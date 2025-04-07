import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

interface UpdateProfileData {
  name?: string;
  email?: string;
}

interface UserState {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: UserState = {
  isLoading: false,
  error: null,
  successMessage: null,
};

const API_URL = "http://localhost:3000";

/**
 * Update user profile (name, email)
 */
export const updateUserProfile = createAsyncThunk(
  "user/updateProfile",
  async (userData: UpdateProfileData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token found");
      }

      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || "Failed to update profile");
      }

      const data = await response.json();

      // If email was changed, the backend will return a new token
      // Store the new token if provided
      if (data.accessToken) {
        localStorage.setItem("token", data.accessToken);
      }

      // Update the stored auth data
      const authData = localStorage.getItem("auth");
      if (authData) {
        const parsed = JSON.parse(authData);
        localStorage.setItem(
          "auth",
          JSON.stringify({
            ...parsed,
            user: {
              ...parsed.user,
              ...userData,
            },
          })
        );
      }

      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
);

/**
 * Delete user account
 */
export const deleteUserAccount = createAsyncThunk("user/deleteAccount", async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      return rejectWithValue("No authentication token found");
    }

    const response = await fetch(`${API_URL}/api/users/profile`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return rejectWithValue(error.message || "Failed to delete account");
    }

    // Clear local storage
    localStorage.removeItem("token");
    localStorage.removeItem("auth");

    return true;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Unknown error occurred");
  }
});

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearUserMessages: state => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: builder => {
    // Update profile
    builder
      .addCase(updateUserProfile.pending, state => {
        state.isLoading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateUserProfile.fulfilled, state => {
        state.isLoading = false;
        state.successMessage = "Profile updated successfully";
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete account
    builder
      .addCase(deleteUserAccount.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteUserAccount.fulfilled, state => {
        state.isLoading = false;
      })
      .addCase(deleteUserAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearUserMessages } = userSlice.actions;
export default userSlice.reducer;
