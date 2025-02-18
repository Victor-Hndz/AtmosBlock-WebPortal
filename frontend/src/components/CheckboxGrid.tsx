import React from "react";

type CheckboxGridProps = {
  title: string;
  category: keyof FormData;
  items: string[];
  selectedItems: string[];
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
};

type FormData = {
  variables: string[];
  years: string[];
  months: string[];
  days: string[];
  hours: string[];
  area: string;
  types: string[];
  ranges: string[];
  levels: string[];
  format: string;
  out: string;
  tracking: boolean;
  debug: boolean;
  no_compile: boolean;
  no_execute: boolean;
  no_maps: boolean;
  animation: boolean;
  omp: boolean;
  mpi: boolean;
  n_threads: number;
  n_proces: number;
};

const CheckboxGrid: React.FC<CheckboxGridProps> = ({
  title,
  category,
  items,
  selectedItems,
  setFormData,
}) => {
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [category]: checked
        ? [...(prev[category] as string[]), value]
        : (prev[category] as string[]).filter((item) => item !== value),
    }));
  };

  const handleSelectAll = () => {
    setFormData((prev) => ({
      ...prev,
      [category]:
        Array.isArray(prev[category]) && prev[category].length === items.length
          ? []
          : items,
    }));
  };

  const handleClear = () => {
    setFormData((prev) => ({
      ...prev,
      [category]: [],
    }));
  };

  return (
    <div className="form-section">
      <h3>
        {title}{" "}
        <button type="button" className="select-all" onClick={handleSelectAll}>
          Select all
        </button>
        <button type="button" className="clear-all" onClick={handleClear}>
          Clear all
        </button>
      </h3>
      {selectedItems.length === 0 && (
        <p className="error-message">At least one selection must be made</p>
      )}
      <div className="checkbox-grid">
        {items.map((item) => (
          <label key={item} className="checkbox-label">
            <input
              type="checkbox"
              value={item}
              checked={selectedItems.includes(item)}
              onChange={handleCheckboxChange}
            />
            {item}
          </label>
        ))}
      </div>
    </div>
  );
};

export default CheckboxGrid;
