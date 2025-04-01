import React from "react";
import * as Switch from "@radix-ui/react-switch";
import * as Select from "@radix-ui/react-select";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import FormField from "./FormField";
import { RequestForm } from "@/redux/slices/requestsSlice";

interface AdvancedSettingsFormProps {
  formData: RequestForm;
  updateFormField: <K extends keyof RequestForm>(field: K, value: RequestForm[K]) => void;
  advancedMode: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * Available file formats
 */
const fileFormatOptions = ["NetCDF", "GRIB", "CSV", "JSON"];

/**
 * Advanced settings form component for the third step of the request form
 */
const AdvancedSettingsForm: React.FC<AdvancedSettingsFormProps> = ({
  formData,
  updateFormField,
  advancedMode,
  onNext,
  onPrevious,
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Advanced Settings</h2>

      <div>
        {" "}
        {/* Changed from Form.Root to plain div */}
        <FormField id="fileFormat" label="File Format" tooltip="Select the output file format for your data">
          <Select.Root value={formData.fileFormat ?? ""} onValueChange={value => updateFormField("fileFormat", value)}>
            <Select.Trigger
              className="inline-flex items-center justify-between w-full px-3 py-2 text-sm border border-slate-300 
                        rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 
                        focus:border-violet-500"
              aria-label="File Format"
            >
              <Select.Value placeholder="Select a file format" />
              <Select.Icon>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border border-slate-200 z-50">
                <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-white text-slate-700 cursor-default">
                  <ChevronUp className="w-4 h-4" />
                </Select.ScrollUpButton>
                <Select.Viewport className="p-1">
                  {fileFormatOptions.map(format => (
                    <Select.Item
                      key={format}
                      value={format}
                      className="relative flex items-center h-8 px-6 text-sm rounded-md select-none 
                              hover:bg-violet-100 data-[highlighted]:outline-none data-[highlighted]:bg-violet-100"
                    >
                      <Select.ItemText>{format}</Select.ItemText>
                      <Select.ItemIndicator className="absolute left-1 inline-flex items-center">
                        <Check className="w-4 h-4 text-violet-600" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Viewport>
                <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-white text-slate-700 cursor-default">
                  <ChevronDown className="w-4 h-4" />
                </Select.ScrollDownButton>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </FormField>
        {advancedMode && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField id="tracking" label="Enable Tracking" tooltip="Enable tracking of request execution">
                <div className="flex items-center h-5">
                  <Switch.Root
                    id="tracking"
                    checked={formData.tracking || false}
                    onCheckedChange={checked => updateFormField("tracking", checked)}
                    className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
                  >
                    <Switch.Thumb
                      className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 
                                  transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5"
                    />
                  </Switch.Root>
                </div>
              </FormField>

              <FormField id="debug" label="Debug Mode" tooltip="Enable debug output during processing">
                <div className="flex items-center h-5">
                  <Switch.Root
                    id="debug"
                    checked={formData.debug || false}
                    onCheckedChange={checked => updateFormField("debug", checked)}
                    className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
                  >
                    <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
                  </Switch.Root>
                </div>
              </FormField>

              <FormField id="noCompile" label="Skip Compilation" tooltip="Skip compilation step">
                <div className="flex items-center h-5">
                  <Switch.Root
                    id="noCompile"
                    checked={formData.noCompile || false}
                    onCheckedChange={checked => updateFormField("noCompile", checked)}
                    className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
                  >
                    <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
                  </Switch.Root>
                </div>
              </FormField>

              <FormField id="noExecute" label="Skip Execution" tooltip="Skip execution step">
                <div className="flex items-center h-5">
                  <Switch.Root
                    id="noExecute"
                    checked={formData.noExecute || false}
                    onCheckedChange={checked => updateFormField("noExecute", checked)}
                    className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
                  >
                    <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
                  </Switch.Root>
                </div>
              </FormField>

              <FormField id="noMaps" label="Skip Map Generation" tooltip="Skip map generation step">
                <div className="flex items-center h-5">
                  <Switch.Root
                    id="noMaps"
                    checked={formData.noMaps || false}
                    onCheckedChange={checked => updateFormField("noMaps", checked)}
                    className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
                  >
                    <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
                  </Switch.Root>
                </div>
              </FormField>

              <FormField id="animation" label="Generate Animation" tooltip="Generate animation from maps">
                <div className="flex items-center h-5">
                  <Switch.Root
                    id="animation"
                    checked={formData.animation || false}
                    onCheckedChange={checked => updateFormField("animation", checked)}
                    className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
                  >
                    <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
                  </Switch.Root>
                </div>
              </FormField>
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4">
              <h3 className="text-lg font-medium mb-3 text-slate-900">Parallel Processing Options</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField id="omp" label="Enable OpenMP" tooltip="Use OpenMP for parallel processing">
                  <div className="flex items-center h-5">
                    <Switch.Root
                      id="omp"
                      checked={formData.omp || false}
                      onCheckedChange={checked => updateFormField("omp", checked)}
                      className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
                    >
                      <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
                    </Switch.Root>
                  </div>
                </FormField>

                {formData.omp && (
                  <FormField id="nThreads" label="Use Multiple Threads" tooltip="Enable multithreading">
                    <div className="flex items-center h-5">
                      <Switch.Root
                        id="nThreads"
                        checked={formData.nThreads || false}
                        onCheckedChange={checked => updateFormField("nThreads", checked)}
                        className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
                      >
                        <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
                      </Switch.Root>
                    </div>
                  </FormField>
                )}

                <FormField id="mpi" label="Enable MPI" tooltip="Use MPI for distributed processing">
                  <div className="flex items-center h-5">
                    <Switch.Root
                      id="mpi"
                      checked={formData.mpi || false}
                      onCheckedChange={checked => updateFormField("mpi", checked)}
                      className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
                    >
                      <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
                    </Switch.Root>
                  </div>
                </FormField>

                {formData.mpi && (
                  <FormField id="nProces" label="Use Multiple Processes" tooltip="Enable multi-process execution">
                    <div className="flex items-center h-5">
                      <Switch.Root
                        id="nProces"
                        checked={formData.nProces || false}
                        onCheckedChange={checked => updateFormField("nProces", checked)}
                        className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
                      >
                        <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
                      </Switch.Root>
                    </div>
                  </FormField>
                )}
              </div>
            </div>
          </>
        )}
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
        <button
          type="button"
          onClick={onNext}
          className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 
                    focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
                    transition-colors duration-200"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AdvancedSettingsForm;
