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
