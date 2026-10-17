import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateRequestDto } from "./create-request.dto";

// WEB-221: una variable que el pipeline no soporta llegaba hasta el CDS y la petición se quedaba colgada.
describe("CreateRequestDto.variableName", () => {
  const base = {
    pressureLevels: ["500"],
    years: ["2022"],
    months: ["03"],
    days: ["14"],
    hours: ["12"],
    areaCovered: ["90", "-180", "-90", "180"],
    mapTypes: ["comb"],
  };

  const erroresDe = async (variableName: string) =>
    (await validate(plainToInstance(CreateRequestDto, { ...base, variableName }))).map(e => e.property);

  it.each(["geopotential", "temperature"])("acepta %s", async variable => {
    expect(await erroresDe(variable)).toEqual([]);
  });

  it.each(["humidity", "u-component_of_wind", ""])("rechaza %p", async variable => {
    expect(await erroresDe(variable)).toContain("variableName");
  });
});

// V5/WEB-301: hilos y procesos acaban en el argv del núcleo; solo enteros positivos.
describe("CreateRequestDto.nThreads / nProces", () => {
  const base = {
    variableName: "geopotential",
    pressureLevels: ["500"],
    years: ["2022"],
    months: ["03"],
    days: ["14"],
    hours: ["12"],
    areaCovered: ["90", "-180", "-90", "180"],
    mapTypes: ["comb"],
    omp: true,
    mpi: true,
  };

  const erroresDe = async (cambios: object) =>
    (await validate(plainToInstance(CreateRequestDto, { ...base, ...cambios }))).map(e => e.property);

  it.each([2.5, 0, -3])("rechaza %p hilos y procesos", async valor => {
    expect(await erroresDe({ nThreads: valor, nProces: valor })).toEqual(["nThreads", "nProces"]);
  });

  it("los valida también sin omp ni mpi (la ejecución los recibe igual)", async () => {
    expect(await erroresDe({ omp: false, mpi: false, nThreads: 2.5, nProces: 0 })).toEqual(["nThreads", "nProces"]);
  });

  it("acepta enteros positivos o nada", async () => {
    expect(await erroresDe({ nThreads: 4, nProces: 2 })).toEqual([]);
    expect(await erroresDe({})).toEqual([]);
  });
});
