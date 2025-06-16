import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { RequestForm } from "@/types/Request";
import { API_URL_REQUESTS, API_URL_REQUESTS_NO_AUTH } from "@/consts/apiConsts";

interface SubmitRequestsState {
  form: RequestForm;
  isSubmitting: boolean;
  isLoading: boolean;
  error: string | null;
  requestHash: string | null;
}

const initialState: SubmitRequestsState = {
  isLoading: false,
  error: null,
  form: {
    // Initialize array fields with empty arrays to prevent null/undefined issues
    pressureLevels: [],
    years: [],
    months: [],
    days: [],
    hours: [],
    areaCovered: [],
    mapTypes: [],
    mapLevels: [],
  } as RequestForm,
  isSubmitting: false,
  requestHash: null,
};

/**
 * Submit a new request
 */
export const submitRequest = createAsyncThunk(
  "requests/submitRequest",
  async (requestData: RequestForm, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      let response;

      if (!token) {
        response = await fetch(API_URL_REQUESTS_NO_AUTH, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });
      } else {
        response = await fetch(API_URL_REQUESTS, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message ?? "Failed to submit request");
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
    clearRequestHash: state => {
      state.requestHash = null;
    },
    /**
     * Prefills the form with data from a previous request
     * @param state Current state
     * @param action Action with previous request data
     */
    prefillForm: (state, action: PayloadAction<RequestForm>) => {
      state.form = action.payload;
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
      .addCase(submitRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSubmitting = false;
        // Store the request hash for redirection
        state.requestHash = action.payload.hash || action.payload.requestHash || null;
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

export const { clearRequestsError, updateFormField, clearRequestHash, prefillForm } = submitRequestsSlice.actions;
export default submitRequestsSlice.reducer;
