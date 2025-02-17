import { useState } from "react";
import "./Form.css"; // Asegúrate de crear un archivo CSS para los estilos

const RequestForm = () => {
  const [formData, setFormData] = useState({
    variable: "",
    pressure_levels: [],
    years: [],
    months: [],
    days: [],
    hours: [],
    area: [],
    types: [],
    ranges: [],
    levels: [],
    instants: [],
    all: false,
    format: false,
    out: false,
    tracking: false,
    debug: false,
    no_compile: false,
    no_execute: false,
    no_compile_execute: false,
    no_maps: false,
    animation: false,
    omp: false,
    mpi: false,
    n_threads: 0,
    n_proces: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form Data:", formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <label>
        Variable:
        <input
          type="text"
          name="variable"
          value={formData.variable}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Pressure Levels:
        <input
          type="text"
          name="pressure_levels"
          value={formData.pressure_levels}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Years:
        <input
          type="text"
          name="years"
          value={formData.years}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Months:
        <input
          type="text"
          name="months"
          value={formData.months}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Days:
        <input
          type="text"
          name="days"
          value={formData.days}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Hours:
        <input
          type="text"
          name="hours"
          value={formData.hours}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Area (N, S, E, W or all):
        <input
          type="text"
          name="area"
          value={formData.area}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Types:
        <input
          type="text"
          name="types"
          value={formData.types}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Ranges:
        <input
          type="text"
          name="ranges"
          value={formData.ranges}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Levels:
        <input
          type="text"
          name="levels"
          value={formData.levels}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Instants:
        <input
          type="text"
          name="instants"
          value={formData.instants}
          onChange={handleChange}
        />
      </label>
      <label>
        All:
        <input
          type="checkbox"
          name="all"
          checked={formData.all}
          onChange={handleChange}
        />
      </label>
      <label>
        Format:
        <input
          type="checkbox"
          name="format"
          checked={formData.format}
          onChange={handleChange}
        />
      </label>
      <label>
        Out:
        <input
          type="checkbox"
          name="out"
          checked={formData.out}
          onChange={handleChange}
        />
      </label>
      <label>
        Tracking:
        <input
          type="checkbox"
          name="tracking"
          checked={formData.tracking}
          onChange={handleChange}
        />
      </label>
      <label>
        Debug:
        <input
          type="checkbox"
          name="debug"
          checked={formData.debug}
          onChange={handleChange}
        />
      </label>
      <label>
        No Compile:
        <input
          type="checkbox"
          name="no_compile"
          checked={formData.no_compile}
          onChange={handleChange}
        />
      </label>
      <label>
        No Execute:
        <input
          type="checkbox"
          name="no_execute"
          checked={formData.no_execute}
          onChange={handleChange}
        />
      </label>
      <label>
        No Compile & Execute:
        <input
          type="checkbox"
          name="no_compile_execute"
          checked={formData.no_compile_execute}
          onChange={handleChange}
        />
      </label>
      <label>
        No Maps:
        <input
          type="checkbox"
          name="no_maps"
          checked={formData.no_maps}
          onChange={handleChange}
        />
      </label>
      <label>
        Animation:
        <input
          type="checkbox"
          name="animation"
          checked={formData.animation}
          onChange={handleChange}
        />
      </label>
      <label>
        OMP:
        <input
          type="checkbox"
          name="omp"
          checked={formData.omp}
          onChange={handleChange}
        />
      </label>
      <label>
        MPI:
        <input
          type="checkbox"
          name="mpi"
          checked={formData.mpi}
          onChange={handleChange}
        />
      </label>
      <label>
        Number of Threads:
        <input
          type="number"
          name="n_threads"
          value={formData.n_threads}
          onChange={handleChange}
        />
      </label>
      <label>
        Number of Processes:
        <input
          type="number"
          name="n_proces"
          value={formData.n_proces}
          onChange={handleChange}
        />
      </label>
      <button type="submit">Submit</button>
    </form>
  );
};

export default RequestForm;
