import React from "react";
import { RequestForm } from "@/redux/slices/requestsSlice";

interface RequestSummaryProps {
  formData: RequestForm;
  onPrevious: () => void;
}

/**
 * Component to display a summary of the request form data before submission
 */
const RequestSummary: React.FC<RequestSummaryProps> = ({ formData, onPrevious }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Request Summary</h2>
      <p className="text-sm text-slate-500">Please review your request details before submitting:</p>

      <div className="bg-slate-50 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-slate-900">Basic Information</h3>
        </div>
        <div className="border-t border-slate-200">
          <dl>
            <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-slate-500">Variable Name</dt>
              <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{formData.variableName}</dd>
            </div>
            <div className="bg-slate-50 px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-slate-500">Years</dt>
              <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{formData.years?.join(", ")}</dd>
            </div>
            <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-slate-500">Months</dt>
              <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{formData.months?.join(", ")}</dd>
            </div>
            <div className="bg-slate-50 px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-slate-500">Days</dt>
              <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{formData.days?.join(", ")}</dd>
            </div>
            <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-slate-500">Hours</dt>
              <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{formData.hours?.join(", ")}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-slate-50 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-slate-900">Map Configuration</h3>
        </div>
        <div className="border-t border-slate-200">
          <dl>
            <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-slate-500">Pressure Levels</dt>
              <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                {formData.pressureLevels?.join(", ")}
              </dd>
            </div>
            <div className="bg-slate-50 px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-slate-500">Areas Covered</dt>
              <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{formData.areaCovered?.join(", ")}</dd>
            </div>
            <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-slate-500">Map Types</dt>
              <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{formData.mapTypes?.join(", ")}</dd>
            </div>
            <div className="bg-slate-50 px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-slate-500">Map Ranges</dt>
              <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{formData.mapRanges?.join(", ")}</dd>
            </div>
            <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-slate-500">Map Levels</dt>
              <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{formData.mapLevels?.join(", ")}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-slate-50 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-slate-900">Advanced Settings</h3>
        </div>
        <div className="border-t border-slate-200">
          <dl>
            {formData.fileFormat && (
              <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-slate-500">File Format</dt>
                <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{formData.fileFormat}</dd>
              </div>
            )}
            <div className="bg-slate-50 px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-slate-500">Options</dt>
              <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                <ul className="grid grid-cols-2 gap-2">
                  {formData.tracking && <li>Tracking: Enabled</li>}
                  {formData.debug && <li>Debug: Enabled</li>}
                  {formData.noCompile && <li>Skip Compilation: Yes</li>}
                  {formData.noExecute && <li>Skip Execution: Yes</li>}
                  {formData.noMaps && <li>Skip Map Generation: Yes</li>}
                  {formData.animation && <li>Generate Animation: Yes</li>}
                  {formData.omp && <li>OpenMP: Enabled</li>}
                  {formData.nThreads && <li>Use Multiple Threads: Yes</li>}
                  {formData.mpi && <li>MPI: Enabled</li>}
                  {formData.nProces && <li>Use Multiple Processes: Yes</li>}
                </ul>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrevious}
          className="px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 
                    bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
                    transition-colors duration-200"
        >
          Previous
        </button>
      </div>
    </div>
  );
};

export default RequestSummary;
