import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { fromUserRequestsReturnedToUserRequest, UserRequest, UserRequestsReturned } from "@/types/Request";
import { API_URL_REQUESTS_MY_REQUESTS } from "@/consts/apiConsts";

interface ViewRequestsState {
  items: UserRequest[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ViewRequestsState = {
  items: [],
  isLoading: false,
  error: null,
};

/**
 * Fetch user requests from the API
 */
export const fetchUserRequests = createAsyncThunk("requests/fetchUserRequests", async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      return rejectWithValue("No authentication token found");
    }

    // Updated to use the correct endpoint
    const response = await fetch(API_URL_REQUESTS_MY_REQUESTS, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return rejectWithValue(error.message || "Failed to fetch requests");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Unknown error occurred");
  }
});

const viewRequestsSlice = createSlice({
  name: "viewRequests",
  initialState,
  reducers: {
    clearRequestsError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // Fetch user requests
    builder
      .addCase(fetchUserRequests.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserRequests.fulfilled, (state, action: PayloadAction<UserRequestsReturned[]>) => {
        state.isLoading = false;
        state.items = action.payload.map(fromUserRequestsReturnedToUserRequest);
      })
      .addCase(fetchUserRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearRequestsError } = viewRequestsSlice.actions;
export default viewRequestsSlice.reducer;
