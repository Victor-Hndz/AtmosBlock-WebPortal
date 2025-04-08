import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Request, RequestForm } from "@/types/Request";

interface RequestsState {
  items: Request[];
  isLoading: boolean;
  error: string | null;
  form: RequestForm;
  isSubmitting: boolean;
}

const initialState: RequestsState = {
  items: [],
  isLoading: false,
  error: null,
  form: {} as RequestForm,
  isSubmitting: false,
};

const API_URL = "http://localhost:3000";

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
    const response = await fetch(`${API_URL}/api/requests/my-requests`, {
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

/**
 * Submit a new request
 */
export const submitRequest = createAsyncThunk(
  "requests/submitRequest",
  async (requestData: Omit<Request, "id" | "userId" | "status" | "createdAt" | "updatedAt">, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token found");
      }

      const response = await fetch(`${API_URL}/api/requests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || "Failed to submit request");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Unknown error occurred");
    }
  }
);

const requestsSlice = createSlice({
  name: "requests",
  initialState,
  reducers: {
    clearRequestsError: state => {
      state.error = null;
    },
    updateFormField: (state, action: PayloadAction<{ field: keyof RequestForm; value: any }>) => {
      const { field, value } = action.payload;
      if (state.form) {
        state.form[field] = value;
      }
    },
  },
  extraReducers: builder => {
    // Fetch user requests
    builder
      .addCase(fetchUserRequests.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserRequests.fulfilled, (state, action: PayloadAction<Request[]>) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchUserRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Submit request
    builder
      .addCase(submitRequest.pending, state => {
        state.isLoading = true;
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitRequest.fulfilled, (state, action: PayloadAction<Request>) => {
        state.isLoading = false;
        state.isSubmitting = false;
        state.items.push(action.payload);
        // Clear form data after successful submission
        state.form = {} as RequestForm;
      })
      .addCase(submitRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.isSubmitting = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearRequestsError, updateFormField } = requestsSlice.actions;
export default requestsSlice.reducer;
