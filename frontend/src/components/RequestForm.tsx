import { useState } from "react";
import "./Form.css";
import CheckboxGrid from "./CheckboxGrid";
import RegionSelector from "./RegionSelector";

const variables = ["Geopotential", "Temperature"];

const years = Array.from({ length: 2025 - 1940 }, (_, i) => (1940 + i).toString());

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0") + ":00");

const pressureLevels = [
  "1 hPa",
  "100 hPa",
  "200 hPa",
  "300 hPa",
  "500 hPa",
  "550 hPa",
  "850 hPa",
  "925 hPa",
  "1000 hPa",
];

const types = ["forms", "both"];

const ranges = ["max", "min", "both", "comb"];

const format = ["svg", "png", "pdf"];

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

const RequestForm = () => {
  const [formData, setFormData] = useState<FormData>({
    variables: [],
    years: [],
    months: [],
    days: [],
    hours: [],
    area: "all",
    types: [],
    ranges: [],
    levels: [],
    format: "svg",
    out: "out",
    tracking: false,
    debug: false,
    no_compile: false,
    no_execute: false,

    no_maps: false,
    animation: false,
    omp: false,
    mpi: false,
    n_threads: 0,
    n_proces: 0,
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form Data:", formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <CheckboxGrid
        title="Variable"
        category="variables"
        items={variables}
        selectedItems={formData.variables}
        setFormData={setFormData}
      />
      <CheckboxGrid
        title="Year"
        category="years"
        items={years}
        selectedItems={formData.years}
        setFormData={setFormData}
      />
      <CheckboxGrid
        title="Month"
        category="months"
        items={months}
        selectedItems={formData.months}
        setFormData={setFormData}
      />
      <CheckboxGrid title="Day" category="days" items={days} selectedItems={formData.days} setFormData={setFormData} />
      <CheckboxGrid
        title="Time"
        category="hours"
        items={hours}
        selectedItems={formData.hours}
        setFormData={setFormData}
      />
      <CheckboxGrid
        title="Pressure level"
        category="levels"
        items={pressureLevels}
        selectedItems={formData.levels}
        setFormData={setFormData}
      />
      <RegionSelector setFormData={setFormData} />
      <CheckboxGrid
        title="Type"
        category="types"
        items={types}
        selectedItems={formData.types}
        setFormData={setFormData}
      />
      <CheckboxGrid
        title="Range"
        category="ranges"
        items={ranges}
        selectedItems={formData.ranges}
        setFormData={setFormData}
      />
      {/* for format, a selector */}
      <div className="form-section">
        <label htmlFor="format">Format: </label>
        <select
          id="format"
          value={formData.format}
          onChange={e =>
            setFormData(prev => ({
              ...prev,
              format: e.target.value,
            }))
          }
        >
          {format.map(f => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      {/* for out, a text input and a checkbox, if checkbox selected, input available */}
      <div className="form-section">
        <input
          type="checkbox"
          id="out"
          checked={formData.out !== ""}
          onChange={e =>
            setFormData(prev => ({
              ...prev,
              out: e.target.checked ? "output" : "",
            }))
          }
        />
        <label htmlFor="out">Output? </label>
        {formData.out !== "" && (
          <input
            type="text"
            value={formData.out}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                out: e.target.value,
              }))
            }
          />
        )}
      </div>
      {/* for tracking, a checkbox */}
      <div className="form-section">
        <input
          type="checkbox"
          id="tracking"
          checked={formData.tracking}
          onChange={e =>
            setFormData(prev => ({
              ...prev,
              tracking: e.target.checked,
            }))
          }
        />
        <label htmlFor="tracking">Tracking</label>
      </div>
      {/* for debug, a checkbox */}
      <div className="form-section">
        <input
          type="checkbox"
          id="debug"
          checked={formData.debug}
          onChange={e =>
            setFormData(prev => ({
              ...prev,
              debug: e.target.checked,
            }))
          }
        />
        <label htmlFor="debug">Debug</label>
      </div>
      {/* for no_compile, a checkbox */}
      <div className="form-section">
        <input
          type="checkbox"
          id="no_compile"
          checked={formData.no_compile}
          onChange={e =>
            setFormData(prev => ({
              ...prev,
              no_compile: e.target.checked,
            }))
          }
        />
        <label htmlFor="no_compile">No compile</label>
      </div>
      {/* for no_execute, a checkbox */}
      <div className="form-section">
        <input
          type="checkbox"
          id="no_execute"
          checked={formData.no_execute}
          onChange={e =>
            setFormData(prev => ({
              ...prev,
              no_execute: e.target.checked,
            }))
          }
        />
        <label htmlFor="no_execute">No execute</label>
      </div>
      {/* for no_maps, a checkbox */}
      <div className="form-section">
        <input
          type="checkbox"
          id="no_maps"
          checked={formData.no_maps}
          onChange={e =>
            setFormData(prev => ({
              ...prev,
              no_maps: e.target.checked,
            }))
          }
        />
        <label htmlFor="no_maps">No maps</label>
      </div>
      {/* for animation, a checkbox */}
      <div className="form-section">
        <input
          type="checkbox"
          id="animation"
          checked={formData.animation}
          onChange={e =>
            setFormData(prev => ({
              ...prev,
              animation: e.target.checked,
            }))
          }
        />
        <label htmlFor="animation">Animation</label>
      </div>
      {/* for omp, a checkbox */}
      <div className="form-section">
        <input
          type="checkbox"
          id="omp"
          checked={formData.omp}
          onChange={e =>
            setFormData(prev => ({
              ...prev,
              omp: e.target.checked,
            }))
          }
        />
        <label htmlFor="omp">OMP</label>
      </div>
      {/* for n_threads, a number input if omp is checked */}
      {formData.omp && (
        <div className="form-section">
          <label htmlFor="n_threads">Number of threads: </label>
          <input
            type="number"
            id="n_threads"
            value={formData.n_threads}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                n_threads: parseInt(e.target.value),
              }))
            }
          />
        </div>
      )}
      {/* for mpi, a checkbox */}
      <div className="form-section">
        <input
          type="checkbox"
          id="mpi"
          checked={formData.mpi}
          onChange={e =>
            setFormData(prev => ({
              ...prev,
              mpi: e.target.checked,
            }))
          }
        />
        <label htmlFor="mpi">MPI</label>
      </div>
      {/* for n_proces, a number input if mpi is checked */}
      {formData.mpi && (
        <div className="form-section">
          <label htmlFor="n_proces">Number of processes: </label>
          <input
            type="number"
            id="n_proces"
            value={formData.n_proces}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                n_proces: parseInt(e.target.value),
              }))
            }
          />
        </div>
      )}
      <button type="submit" className="submit-button">
        Submit
      </button>
    </form>
  );
};

export default RequestForm;
