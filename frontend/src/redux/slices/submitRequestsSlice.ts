import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { RequestForm } from "@/types/Request";
import { API_URL_REQUESTS } from "@/consts/apiConsts";

interface SubmitRequestsState {
  form: RequestForm;
  isSubmitting: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: SubmitRequestsState = {
  isLoading: false,
  error: null,
  form: {} as RequestForm,
  isSubmitting: false,
};

/**
 * Submit a new request
 */
export const submitRequest = createAsyncThunk(
  "requests/submitRequest",
  async (requestData: RequestForm, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return rejectWithValue("No authentication token found");
      }

      const response = await fetch(API_URL_REQUESTS, {
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

const submitRequestsSlice = createSlice({
  name: "submitRequests",
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
    // Submit request
    builder
      .addCase(submitRequest.pending, state => {
        state.isLoading = true;
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitRequest.fulfilled, (state, action: PayloadAction<RequestForm>) => {
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

export const { clearRequestsError, updateFormField } = submitRequestsSlice.actions;
export default submitRequestsSlice.reducer;
