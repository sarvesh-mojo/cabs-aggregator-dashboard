// src/globals.d.ts or any other .d.ts file
declare module "*.jsx" {
  import { FC } from "react";
  const component: FC<any>;
  export default component;
}
