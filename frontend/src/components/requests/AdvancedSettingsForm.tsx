import React, { useMemo, useCallback } from "react";
import * as Switch from "@radix-ui/react-switch";
import * as Select from "@radix-ui/react-select";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import FormField from "./FormField";
import { RequestForm } from "@/types/Request";
import { FILE_FORMAT_OPTIONS } from "@/consts/requestsConsts";

interface AdvancedSettingsFormProps {
  formData: RequestForm;
  updateFormField: <K extends keyof RequestForm>(field: K, value: RequestForm[K]) => void;
  advancedMode: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

/**
 * Advanced settings form component for the third step of the request form
 */
const AdvancedSettingsForm: React.FC<AdvancedSettingsFormProps> = ({
  formData = {} as RequestForm,
  updateFormField,
  advancedMode,
  onNext,
  onPrevious,
}) => {
  const { t } = useTranslation();

  /**
   * Memoized handler for updating switch state
   */
  const handleSwitchChange = useCallback(
    <K extends keyof RequestForm>(field: K, checked: boolean) => {
      updateFormField(field, checked as unknown as RequestForm[K]);
    },
    [updateFormField]
  );

  // Memoize the file format section to prevent re-renders
  const fileFormatSection = useMemo(
    () => (
      <FormField
        id="fileFormat"
        label={t("requests-form.fileFormat")}
        tooltip={t("requests-form.fileFormatTooltip", "Select the output file format for your data")}
      >
        <Select.Root value={formData?.fileFormat ?? ""} onValueChange={value => updateFormField("fileFormat", value)}>
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
                {FILE_FORMAT_OPTIONS.map(format => (
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
    ),
    [formData?.fileFormat, t, updateFormField]
  );

  // Memoize the advanced options section to prevent re-renders
  const advancedOptionsSection = useMemo(() => {
    if (!advancedMode) return null;

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="tracking"
            label={t("requests-form.tracking")}
            tooltip={t("requests-form.trackingTooltip", "Enable tracking of request execution")}
          >
            <div className="flex items-center h-5">
              <Switch.Root
                id="tracking"
                checked={formData?.tracking || false}
                onCheckedChange={checked => handleSwitchChange("tracking", checked)}
                className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
              >
                <Switch.Thumb
                  className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 
                                  transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5"
                />
              </Switch.Root>
            </div>
          </FormField>
          <FormField
            id="noCompile"
            label={t("requests-form.noCompile")}
            tooltip={t("requests-form.noCompileTooltip", "Skip compilation step")}
          >
            <div className="flex items-center h-5">
              <Switch.Root
                id="noCompile"
                checked={formData?.noCompile || false}
                onCheckedChange={checked => handleSwitchChange("noCompile", checked)}
                className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
              >
                <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
              </Switch.Root>
            </div>
          </FormField>

          <FormField
            id="noExecute"
            label={t("requests-form.noExecute")}
            tooltip={t("requests-form.noExecuteTooltip", "Skip execution step")}
          >
            <div className="flex items-center h-5">
              <Switch.Root
                id="noExecute"
                checked={formData?.noExecute || false}
                onCheckedChange={checked => handleSwitchChange("noExecute", checked)}
                className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
              >
                <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
              </Switch.Root>
            </div>
          </FormField>

          <FormField
            id="noMaps"
            label={t("requests-form.noMaps")}
            tooltip={t("requests-form.noMapsTooltip", "Skip map generation step")}
          >
            <div className="flex items-center h-5">
              <Switch.Root
                id="noMaps"
                checked={formData?.noMaps || false}
                onCheckedChange={checked => handleSwitchChange("noMaps", checked)}
                className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
              >
                <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
              </Switch.Root>
            </div>
          </FormField>

          <FormField
            id="animation"
            label={t("requests-form.animation")}
            tooltip={t("requests-form.animationTooltip", "Generate animation from maps")}
          >
            <div className="flex items-center h-5">
              <Switch.Root
                id="animation"
                checked={formData?.animation || false}
                onCheckedChange={checked => handleSwitchChange("animation", checked)}
                className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
              >
                <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
              </Switch.Root>
            </div>
          </FormField>
        </div>

        <div className="border-t border-slate-200 pt-4 mt-4">
          <h3 className="text-lg font-medium mb-3 text-slate-900">
            {t("requests-form.parallelProcessingOptions", "Parallel Processing Options")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              id="omp"
              label={t("requests-form.omp")}
              tooltip={t("requests-form.ompTooltip", "Use OpenMP for parallel processing")}
            >
              <div className="flex items-center h-5">
                <Switch.Root
                  id="omp"
                  checked={formData?.omp || false}
                  onCheckedChange={checked => handleSwitchChange("omp", checked)}
                  className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
                >
                  <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
                </Switch.Root>
              </div>
            </FormField>

            {formData?.omp && (
              <FormField
                id="nThreads"
                label={t("requests-form.nThreads")}
                tooltip={t("requests-form.nThreadsTooltip", "Enable multithreading")}
              >
                <div className="flex items-center h-5">
                  <Switch.Root
                    id="nThreads"
                    checked={formData?.nThreads || false}
                    onCheckedChange={checked => handleSwitchChange("nThreads", checked)}
                    className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
                  >
                    <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
                  </Switch.Root>
                </div>
              </FormField>
            )}

            <FormField
              id="mpi"
              label={t("requests-form.mpi")}
              tooltip={t("requests-form.mpiTooltip", "Use MPI for distributed processing")}
            >
              <div className="flex items-center h-5">
                <Switch.Root
                  id="mpi"
                  checked={formData?.mpi || false}
                  onCheckedChange={checked => handleSwitchChange("mpi", checked)}
                  className="w-10 h-5 bg-slate-300 rounded-full relative data-[state=checked]:bg-violet-600"
                >
                  <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-5" />
                </Switch.Root>
              </div>
            </FormField>

            {formData?.mpi && (
              <FormField
                id="nProces"
                label={t("requests-form.nProces")}
                tooltip={t("requests-form.nProcesTooltip", "Enable multi-process execution")}
              >
                <div className="flex items-center h-5">
                  <Switch.Root
                    id="nProces"
                    checked={formData?.nProces || false}
                    onCheckedChange={checked => handleSwitchChange("nProces", checked)}
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
    );
  }, [advancedMode, formData, t, handleSwitchChange]);

  // Memoize the navigation buttons to prevent re-renders
  const navigationButtons = useMemo(
    () => (
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrevious}
          className="px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 
                    bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
                    transition-colors duration-200"
        >
          {t("buttons.back")}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 
                    focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
                    transition-colors duration-200"
        >
          {t("buttons.next", "Next")}
        </button>
      </div>
    ),
    [onNext, onPrevious, t]
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">{t("requests-titles.advancedSettings")}</h2>

      <div>
        {fileFormatSection}
        {advancedOptionsSection}
      </div>

      {navigationButtons}
    </div>
  );
};

export default React.memo(AdvancedSettingsForm);
