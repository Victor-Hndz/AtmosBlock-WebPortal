/// <reference types="vite/client" />

import "i18next";
import common from "../public/locales/en/common.json";

declare module "i18next" {
  interface CustomTypeOptions {
    resources: {
      common: typeof common;
    };
    defaultNS: "common";
  }
}
