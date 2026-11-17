// Fallback when an install resolves react-icons subpaths to index.js and
// tsc reports TS7016. A resolved package declaration is more specific and wins.
declare module "react-icons/*";
