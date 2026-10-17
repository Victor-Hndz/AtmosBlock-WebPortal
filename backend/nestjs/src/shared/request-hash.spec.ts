import { BadRequestException } from "@nestjs/common";
import { createHash } from "crypto";
import { RequestHashPipe } from "./request-hash";

// V14/WEB-302: el hash viaja hasta rutas de disco (./out/<hash>) y claves de MinIO; solo vale un SHA-256 en hex.
describe("RequestHashPipe", () => {
  const pipe = new RequestHashPipe();
  const valido = createHash("sha256").update("peticion").digest("hex");

  it("deja pasar un SHA-256 en hexadecimal", () => {
    expect(pipe.transform(valido)).toBe(valido);
  });

  it.each(["../x", valido.toUpperCase(), valido.slice(1), `${valido}0`])("rechaza %p", hash => {
    expect(() => pipe.transform(hash)).toThrow(BadRequestException);
  });
});
