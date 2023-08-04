export function dynamicRequire(modName: string) {
  const mod = require(modName);
  return mod.__esModule && mod.default ? mod.default : mod;
}
