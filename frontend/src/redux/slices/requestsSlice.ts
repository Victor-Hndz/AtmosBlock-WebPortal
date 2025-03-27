import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

/**
 * Interface for the request form data
 */
export interface RequestForm {
  // Basic info (required)
  variableName: string;
  years: string[];
  months: string[];
  days: string[];
  hours: string[];
  // Map configuration (required)
  pressureLevels: string[];
  areaCovered: string[];
  mapTypes: string[];
  mapRanges: string[];
  mapLevels: string[];
  // Advanced settings (optional)
  fileFormat?: string;
  tracking?: boolean;
  debug?: boolean;
  noCompile?: boolean;
  noExecute?: boolean;
  noMaps?: boolean;
  animation?: boolean;
  omp?: boolean;
  mpi?: boolean;
  nThreads?: boolean;
  nProces?: boolean;
}

/**
 * Interface for the requests state in Redux
 */
interface RequestsState {
  form: RequestForm;
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;
}

const initialState: RequestsState = {
  form: {
    variableName: "",
    years: [],
    months: [],
    days: [],
    hours: [],
    pressureLevels: [],
    areaCovered: [],
    mapTypes: [],
    mapRanges: [],
    mapLevels: [],
    fileFormat: "",
    tracking: false,
    debug: false,
    noCompile: false,
    noExecute: false,
    noMaps: false,
    animation: false,
    omp: false,
    mpi: false,
    nThreads: false,
    nProces: false,
  },
  isSubmitting: false,
  isSuccess: false,
  error: null,
};

// const url = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const url = "http://localhost:3000";

/**
 * Async thunk for submitting a new request
 */
export const submitRequest = createAsyncThunk(
  "requests/submit",
  async (requestData: RequestForm, { rejectWithValue }) => {
    try {
      const response = await fetch(`${url}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || "Failed to submit request");
      }

      return await response.json();
    } catch (error) {
      console.error("Request submission error:", error);
      return rejectWithValue("Failed to submit request. Please try again.");
    }
  }
);

/**
 * Redux slice for handling requests
 */
const requestsSlice = createSlice({
  name: "requests",
  initialState,
  reducers: {
    // Fixed type handling with a generic function that correctly types both field and value
    updateFormField: <K extends keyof RequestForm>(
      state: RequestsState,
      action: PayloadAction<{ field: K; value: RequestForm[K] }>
    ) => {
      const { field, value } = action.payload;
      state.form[field] = value;
    },
    clearForm: state => {
      state.form = initialState.form;
      state.error = null;
      state.isSuccess = false;
    },
    resetSubmissionStatus: state => {
      state.isSubmitting = false;
      state.isSuccess = false;
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(submitRequest.pending, state => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitRequest.fulfilled, state => {
        state.isSubmitting = false;
        state.isSuccess = true;
      })
      .addCase(submitRequest.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      });
  },
});

export const { updateFormField, clearForm, resetSubmissionStatus } = requestsSlice.actions;
export default requestsSlice.reducer;
