/// <reference types="vite/client" />

import "i18next";
import common from "../public/locales/en/common.json";

declare module "i18next" {
  // Extend i18next's TypeScript interface with your resources
  interface CustomTypeOptions {
    // Custom resources type
    resources: {
      common: typeof common;
    };
    // Optional defaultNS
    defaultNS: "common";
  }
}
